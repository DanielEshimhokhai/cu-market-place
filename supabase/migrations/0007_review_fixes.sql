-- CU Marketplace — 0007 fixes from the final review.

-- #1 A suspended store must stay readable to people who already have orders or conversations with it,
--    otherwise their order and message pages lose the seller's identity.
create or replace function public.has_relationship_with(p_business_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from orders where business_id = p_business_id and buyer_id = auth.uid())
      or exists (select 1 from conversations where business_id = p_business_id and buyer_id = auth.uid())
$$;

drop policy if exists businesses_read on public.businesses;
create policy businesses_read on public.businesses for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin() or public.has_relationship_with(id));

-- #2 Reject an order when a price changed after the buyer last saw it.
create or replace function public.place_orders(p_items jsonb, p_groups jsonb)
returns table(order_id uuid, order_number bigint, business_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_biz record;
  v_fulfilment fulfilment;
  v_note text;
  v_order_id uuid;
  v_number bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from profiles where id = v_uid and cu_verified) then raise exception 'NOT_VERIFIED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_CART';
  end if;
  perform set_config('app.trusted', 'on', true);

  drop table if exists pg_temp._lines;
  create temp table _lines on commit drop as
    select (i->>'product_id')::uuid as product_id,
           nullif(i->>'variant_id', '')::uuid as variant_id,
           (i->>'quantity')::int as quantity,
           nullif(i->>'unit_price_kobo', '')::int as expected_kobo
      from jsonb_array_elements(p_items) i;

  if exists (select 1 from _lines where product_id is null or quantity is null or quantity < 1 or quantity > 20) then
    raise exception 'INVALID_QUANTITY';
  end if;

  perform 1 from products p where p.id in (select l.product_id from _lines l) for update;
  perform 1 from product_variants v where v.id in (select l.variant_id from _lines l where l.variant_id is not null) for update;

  if exists (select 1 from _lines l
               left join products p on p.id = l.product_id
               left join businesses b on b.id = p.business_id
              where p.id is null or p.status <> 'active' or b.status <> 'active') then
    raise exception 'UNAVAILABLE';
  end if;
  if exists (select 1 from _lines l join products p on p.id = l.product_id join businesses b on b.id = p.business_id
              where b.owner_id = v_uid) then
    raise exception 'OWN_PRODUCT';
  end if;
  if exists (select 1 from _lines l where l.variant_id is not null
               and not exists (select 1 from product_variants v where v.id = l.variant_id and v.product_id = l.product_id)) then
    raise exception 'INVALID_VARIANT';
  end if;
  -- The price the buyer saw must still be the price (prices are never taken from the client).
  if exists (select 1 from _lines l join products p on p.id = l.product_id
               left join product_variants v on v.id = l.variant_id
              where l.expected_kobo is not null and l.expected_kobo <> p.price_kobo + coalesce(v.price_delta_kobo, 0)) then
    raise exception 'PRICE_CHANGED';
  end if;
  if exists (select 1 from (select l.product_id, sum(l.quantity) q from _lines l group by l.product_id) s
               join products p on p.id = s.product_id where p.stock is not null and p.stock < s.q)
     or exists (select 1 from (select l.variant_id, sum(l.quantity) q from _lines l where l.variant_id is not null group by l.variant_id) s
               join product_variants v on v.id = s.variant_id where v.stock is not null and v.stock < s.q) then
    raise exception 'OUT_OF_STOCK';
  end if;

  for v_biz in
    select distinct p.business_id as id, b.owner_id, b.name
      from _lines l join products p on p.id = l.product_id join businesses b on b.id = p.business_id
  loop
    select coalesce((g->>'fulfilment')::fulfilment, 'pickup'), nullif(trim(g->>'note'), '')
      into v_fulfilment, v_note
      from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) g
     where (g->>'business_id')::uuid = v_biz.id
     limit 1;
    v_fulfilment := coalesce(v_fulfilment, 'pickup');

    if v_fulfilment = 'delivery' and exists (select 1 from _lines l join products p on p.id = l.product_id
                                               where p.business_id = v_biz.id and not p.allows_delivery) then
      raise exception 'DELIVERY_UNAVAILABLE';
    end if;
    if v_fulfilment = 'pickup' and exists (select 1 from _lines l join products p on p.id = l.product_id
                                             where p.business_id = v_biz.id and not p.allows_pickup) then
      raise exception 'PICKUP_UNAVAILABLE';
    end if;

    insert into orders (buyer_id, business_id, fulfilment, note)
    values (v_uid, v_biz.id, v_fulfilment, left(v_note, 500))
    returning id, number into v_order_id, v_number;

    insert into order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, image_snapshot, unit_price_kobo, quantity)
    select v_order_id, p.id, v.id, p.title,
           case when v.id is not null then v.name || ': ' || v.value end,
           (select pi.path from product_images pi where pi.product_id = p.id order by pi.position limit 1),
           p.price_kobo + coalesce(v.price_delta_kobo, 0),
           l.quantity
      from _lines l join products p on p.id = l.product_id
      left join product_variants v on v.id = l.variant_id
     where p.business_id = v_biz.id;

    update orders set subtotal_kobo = (select coalesce(sum(unit_price_kobo * quantity), 0) from order_items where order_items.order_id = v_order_id)
     where id = v_order_id;

    insert into order_events (order_id, status, actor_id) values (v_order_id, 'pending', v_uid);
    insert into notifications (user_id, type, title, body, href)
    values (v_biz.owner_id, 'order_update', 'New order #' || v_number,
            'A buyer placed an order. Confirm it when you''re ready.', '/sell/orders/' || v_order_id);

    order_id := v_order_id; order_number := v_number; business_id := v_biz.id;
    return next;
  end loop;

  update products p set stock = case when p.stock is null then null else p.stock - s.q end,
                        order_count = p.order_count + s.q
    from (select l.product_id, sum(l.quantity) q from _lines l group by l.product_id) s
   where p.id = s.product_id;
  update product_variants v set stock = v.stock - s.q
    from (select l.variant_id, sum(l.quantity) q from _lines l where l.variant_id is not null group by l.variant_id) s
   where v.id = s.variant_id and v.stock is not null;
  perform set_config('app.trusted', '', true);
end $$;

-- #3 Selling and messaging require a confirmed Covenant University email, enforced in the database
--    (the app checks too, but the Supabase API is public).
create or replace function public.is_cu_verified() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where id = auth.uid() and cu_verified)
$$;

drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses for insert to authenticated
  with check (owner_id = auth.uid() and public.is_cu_verified());

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (public.owns_business(business_id) and public.is_cu_verified());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_cu_verified() and exists (select 1 from public.conversations c where c.id = conversation_id
               and (c.buyer_id = auth.uid() or public.owns_business(c.business_id))));

create or replace function public.start_conversation(p_business_id uuid, p_product_id uuid default null, p_order_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_cu_verified() then raise exception 'NOT_VERIFIED'; end if;
  if not exists (select 1 from businesses where id = p_business_id and status = 'active') then raise exception 'NOT_FOUND'; end if;
  if owns_business(p_business_id) then raise exception 'OWN_BUSINESS'; end if;
  if p_product_id is not null and not exists (select 1 from products where id = p_product_id and business_id = p_business_id) then
    raise exception 'NOT_FOUND';
  end if;
  if p_order_id is not null and not exists (select 1 from orders where id = p_order_id and buyer_id = v_uid and business_id = p_business_id) then
    raise exception 'NOT_FOUND';
  end if;
  insert into conversations (buyer_id, business_id, product_id, order_id)
  values (v_uid, p_business_id, p_product_id, p_order_id)
  on conflict (buyer_id, business_id, product_id) do update set order_id = coalesce(excluded.order_id, conversations.order_id)
  returning id into v_id;
  return v_id;
end $$;

-- #4 Deleting a listing must not erase its reviews or the store's rating history.
alter table public.reviews alter column product_id drop not null;
alter table public.reviews drop constraint if exists reviews_product_id_fkey;
alter table public.reviews add constraint reviews_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

-- #7 The public identity view exposes a short display name ("Tobi A.") instead of full names.
create or replace function public.short_name(p_full text) returns text
language sql immutable as $$
  select case
    when coalesce(trim(p_full), '') = '' then 'Student'
    when array_length(regexp_split_to_array(trim(p_full), '\s+'), 1) = 1 then trim(p_full)
    else split_part(trim(p_full), ' ', 1) || ' ' ||
         upper(left((regexp_split_to_array(trim(p_full), '\s+'))[array_length(regexp_split_to_array(trim(p_full), '\s+'), 1)], 1)) || '.'
  end
$$;

drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, public.short_name(full_name) as display_name, avatar_url, cu_verified from public.profiles;
grant select on public.public_profiles to anon, authenticated;
