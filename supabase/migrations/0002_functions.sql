-- CU Marketplace — 0002 functions & triggers

create or replace function public.cu_email_domains() returns text[]
language sql immutable as $$ select array['stu.cu.edu.ng','covenantuniversity.edu.ng'] $$;

create or replace function public.format_naira(p_kobo integer) returns text
language sql immutable as $$ select '₦' || to_char(round(p_kobo / 100.0), 'FM999,999,999,990') $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.owns_business(p_business_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses where id = p_business_id and owner_id = auth.uid()) $$;

-- True when the current statement is system/admin/trusted-function context.
create or replace function public.is_trusted() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null
      or coalesce(current_setting('app.trusted', true), '') = 'on'
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- ── auth → profiles ────────────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone, affiliation, cu_verified)
  values (new.id, new.email,
          coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
          nullif(trim(new.raw_user_meta_data->>'phone'), ''),
          case when new.raw_user_meta_data->>'affiliation' = 'staff' then 'staff'::affiliation else 'student'::affiliation end,
          new.email_confirmed_at is not null and lower(split_part(new.email, '@', 2)) = any (cu_email_domains()));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set email = new.email,
         cu_verified = new.email_confirmed_at is not null and lower(split_part(new.email, '@', 2)) = any (cu_email_domains())
   where id = new.id and not is_demo;
  return new;
end $$;
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users
  for each row execute function public.handle_user_updated();

-- ── column protection ─────────────────────────────────────────────
create or replace function public.protect_profile() returns trigger language plpgsql as $$
begin
  if not is_trusted() then
    new.role := old.role; new.cu_verified := old.cu_verified; new.email := old.email; new.is_demo := old.is_demo;
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

create or replace function public.protect_business() returns trigger language plpgsql as $$
begin
  if not is_trusted() then
    if tg_op = 'INSERT' then
      new.verified := false; new.status := 'active'; new.rating_avg := 0; new.rating_count := 0; new.is_demo := false;
    else
      new.owner_id := old.owner_id; new.verified := old.verified; new.status := old.status;
      new.rating_avg := old.rating_avg; new.rating_count := old.rating_count; new.is_demo := old.is_demo;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_business before insert or update on public.businesses for each row execute function public.protect_business();

create or replace function public.protect_product() returns trigger language plpgsql as $$
begin
  if not is_trusted() then
    if tg_op = 'INSERT' then
      new.view_count := 0; new.order_count := 0; new.rating_avg := 0; new.rating_count := 0; new.is_demo := false;
      if new.status = 'removed' then new.status := 'draft'; end if;
    else
      if old.status = 'removed' then raise exception 'LISTING_REMOVED'; end if;
      if new.status = 'removed' then raise exception 'NOT_ALLOWED'; end if;
      new.business_id := old.business_id; new.view_count := old.view_count; new.order_count := old.order_count;
      new.rating_avg := old.rating_avg; new.rating_count := old.rating_count; new.is_demo := old.is_demo;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_product before insert or update on public.products for each row execute function public.protect_product();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ── ordering ──────────────────────────────────────────────────────
create or replace function public.place_orders(p_items jsonb, p_groups jsonb)
returns table(order_id uuid, order_number bigint, business_id uuid)
language plpgsql security definer set search_path = public as $$
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
           (i->>'quantity')::int as quantity
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

create or replace function public.set_order_status(p_order_id uuid, p_status order_status, p_instructions text default null)
returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order orders;
  v_owner uuid;
  v_biz_name text;
  v_is_seller boolean;
  v_allowed order_status[];
  v_recipient uuid;
  v_title text;
  v_body text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select owner_id, name into v_owner, v_biz_name from businesses where id = v_order.business_id;
  v_is_seller := v_owner = v_uid;
  if not (v_is_seller or v_order.buyer_id = v_uid or is_admin()) then raise exception 'NOT_FOUND'; end if;
  perform set_config('app.trusted', 'on', true);

  -- instructions-only update
  if p_status = v_order.status then
    if v_is_seller and p_instructions is not null then
      update orders set pickup_instructions = nullif(left(trim(p_instructions), 500), '') where id = p_order_id returning * into v_order;
      insert into notifications (user_id, type, title, body, href)
      values (v_order.buyer_id, 'order_update', 'Pickup details for #' || v_order.number, v_biz_name || ' shared pickup details.', '/orders/' || p_order_id);
    end if;
    perform set_config('app.trusted', '', true);
    return v_order;
  end if;

  v_allowed := case v_order.status
    when 'pending' then array['confirmed','cancelled']::order_status[]
    when 'confirmed' then array['preparing','ready_for_pickup','out_for_delivery','cancelled']::order_status[]
    when 'preparing' then array['ready_for_pickup','out_for_delivery','cancelled']::order_status[]
    when 'ready_for_pickup' then array['completed','cancelled']::order_status[]
    when 'out_for_delivery' then array['completed']::order_status[]
    else array[]::order_status[] end;
  if not (p_status = any (v_allowed))
     or (p_status = 'ready_for_pickup' and v_order.fulfilment <> 'pickup')
     or (p_status = 'out_for_delivery' and v_order.fulfilment <> 'delivery') then
    raise exception 'INVALID_TRANSITION';
  end if;
  if not v_is_seller and not is_admin() then
    if not ((p_status = 'cancelled' and v_order.status = 'pending')
         or (p_status = 'completed' and v_order.status in ('ready_for_pickup','out_for_delivery'))) then
      raise exception 'NOT_ALLOWED';
    end if;
  end if;

  update orders set
    status = p_status,
    pickup_instructions = case when v_is_seller and p_instructions is not null then nullif(left(trim(p_instructions), 500), '') else pickup_instructions end,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    ready_at = case when p_status in ('ready_for_pickup','out_for_delivery') then now() else ready_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = p_order_id returning * into v_order;

  insert into order_events (order_id, status, actor_id) values (p_order_id, p_status, v_uid);

  if p_status = 'cancelled' then
    update products p set stock = p.stock + s.q
      from (select product_id, sum(quantity) q from order_items where order_id = p_order_id and product_id is not null group by product_id) s
     where p.id = s.product_id and p.stock is not null;
    update product_variants v set stock = v.stock + s.q
      from (select variant_id, sum(quantity) q from order_items where order_id = p_order_id and variant_id is not null group by variant_id) s
     where v.id = s.variant_id and v.stock is not null;
  end if;

  v_recipient := case when v_uid = v_order.buyer_id then v_owner else v_order.buyer_id end;
  v_title := case p_status
    when 'confirmed' then 'Order #' || v_order.number || ' confirmed'
    when 'preparing' then 'Order #' || v_order.number || ' is being prepared'
    when 'ready_for_pickup' then 'Order #' || v_order.number || ' is ready for pickup'
    when 'out_for_delivery' then 'Order #' || v_order.number || ' is out for delivery'
    when 'completed' then case when v_recipient = v_owner then 'Order #' || v_order.number || ' marked received' else 'Order #' || v_order.number || ' completed' end
    when 'cancelled' then 'Order #' || v_order.number || ' was cancelled'
    else 'Order #' || v_order.number || ' updated' end;
  v_body := case
    when p_status = 'completed' and v_recipient = v_order.buyer_id then 'How was it? Leave a review for ' || v_biz_name || '.'
    when v_recipient = v_order.buyer_id then v_biz_name || ' updated your order.'
    else 'The buyer updated this order.' end;
  insert into notifications (user_id, type, title, body, href)
  values (v_recipient,
          case when p_status = 'completed' and v_recipient = v_order.buyer_id then 'review_reminder' else 'order_update' end,
          v_title, v_body,
          case when v_recipient = v_owner then '/sell/orders/' || p_order_id else '/orders/' || p_order_id end);
  perform set_config('app.trusted', '', true);
  return v_order;
end $$;

-- ── reviews ───────────────────────────────────────────────────────
create or replace function public.before_review_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  select * into v_order from orders where id = new.order_id;
  if v_order.id is null or v_order.buyer_id <> new.author_id or v_order.status <> 'completed'
     or not exists (select 1 from order_items where order_id = new.order_id and product_id = new.product_id) then
    raise exception 'REVIEW_NOT_ALLOWED';
  end if;
  new.business_id := v_order.business_id;
  if auth.uid() is not null and not is_admin() then new.is_hidden := false; new.is_demo := false; end if;
  return new;
end $$;
create trigger before_review_insert before insert on public.reviews for each row execute function public.before_review_insert();

create or replace function public.refresh_review_aggregates() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
  v_business uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('app.trusted', 'on', true);
  update products set (rating_avg, rating_count) =
    (select coalesce(round(avg(rating)::numeric, 2), 0), count(*) from reviews where product_id = v_product and not is_hidden)
   where id = v_product;
  update businesses set (rating_avg, rating_count) =
    (select coalesce(round(avg(rating)::numeric, 2), 0), count(*) from reviews where business_id = v_business and not is_hidden)
   where id = v_business;
  if tg_op = 'INSERT' and auth.uid() is not null then
    insert into notifications (user_id, type, title, body, href)
    select b.owner_id, 'review', 'New ' || new.rating || '-star review', left(coalesce(new.body, ''), 120), '/b/' || b.slug || '#reviews'
      from businesses b where b.id = v_business;
  end if;
  perform set_config('app.trusted', '', true);
  return null;
end $$;
create trigger review_aggregates after insert or update or delete on public.reviews
  for each row execute function public.refresh_review_aggregates();

-- ── saved-item & follower notifications ───────────────────────────
create or replace function public.notify_product_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and new.price_kobo < old.price_kobo then
    insert into notifications (user_id, type, title, body, href)
    select s.user_id, 'price_drop', 'Price dropped', new.title || ' is now ' || format_naira(new.price_kobo), '/p/' || new.slug
      from saved_products s join profiles pr on pr.id = s.user_id
     where s.product_id = new.id and pr.notify_price_drop;
  end if;
  if new.status = 'active' and old.stock = 0 and coalesce(new.stock, 1) > 0 then
    insert into notifications (user_id, type, title, body, href)
    select s.user_id, 'back_in_stock', 'Back in stock', new.title || ' is available again.', '/p/' || new.slug
      from saved_products s join profiles pr on pr.id = s.user_id
     where s.product_id = new.id and pr.notify_back_in_stock;
  end if;
  return null;
end $$;
create trigger product_changes after update of price_kobo, stock on public.products
  for each row execute function public.notify_product_changes();

create or replace function public.notify_new_listing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status = 'draft') and not new.is_demo then
    insert into notifications (user_id, type, title, body, href)
    select s.user_id, 'new_listing', b.name || ' listed something new', new.title || ' · ' || format_naira(new.price_kobo), '/p/' || new.slug
      from saved_businesses s join businesses b on b.id = s.business_id join profiles pr on pr.id = s.user_id
     where s.business_id = new.business_id and pr.notify_new_listings;
  end if;
  return null;
end $$;
create trigger product_new_listing after insert or update of status on public.products
  for each row execute function public.notify_new_listing();

-- ── messaging ─────────────────────────────────────────────────────
create or replace function public.start_conversation(p_business_id uuid, p_product_id uuid default null, p_order_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
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

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update conversations c set
    buyer_last_read_at = case when c.buyer_id = auth.uid() then now() else c.buyer_last_read_at end,
    seller_last_read_at = case when owns_business(c.business_id) then now() else c.seller_last_read_at end
  where c.id = p_conversation_id and (c.buyer_id = auth.uid() or owns_business(c.business_id));
end $$;

create or replace function public.after_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_conv conversations; v_owner uuid; v_biz text; v_recipient uuid; v_sender_name text;
begin
  select * into v_conv from conversations where id = new.conversation_id;
  select owner_id, name into v_owner, v_biz from businesses where id = v_conv.business_id;
  update conversations set
    last_message_at = new.created_at,
    buyer_last_read_at = case when new.sender_id = v_conv.buyer_id then new.created_at else buyer_last_read_at end,
    seller_last_read_at = case when new.sender_id = v_owner then new.created_at else seller_last_read_at end
   where id = new.conversation_id;
  if new.is_demo then return null; end if;
  v_recipient := case when new.sender_id = v_conv.buyer_id then v_owner else v_conv.buyer_id end;
  if v_conv.last_message_at is null or new.created_at - v_conv.last_message_at > interval '10 minutes' then
    select full_name into v_sender_name from profiles where id = new.sender_id;
    insert into notifications (user_id, type, title, body, href)
    values (v_recipient, 'message',
            'New message from ' || case when v_recipient = v_owner then coalesce(nullif(v_sender_name, ''), 'a buyer') else v_biz end,
            left(new.body, 120), '/messages/' || new.conversation_id);
  end if;
  return null;
end $$;
create trigger after_message_insert after insert on public.messages for each row execute function public.after_message_insert();

-- ── discovery helpers ─────────────────────────────────────────────
create or replace function public.increment_product_view(p_product_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted', 'on', true);
  update products set view_count = view_count + 1 where id = p_product_id and status = 'active';
  perform set_config('app.trusted', '', true);
end $$;

create or replace function public.search_products(p_q text) returns setof public.products
language sql stable set search_path = public, extensions as $$
  with q as (select left(regexp_replace(coalesce(p_q, ''), '\s+', ' ', 'g'), 80) as raw)
  select p.* from products p, q
   where q.raw = '' or trim(q.raw) = ''
      or p.search @@ websearch_to_tsquery('english', q.raw)
      or p.title ilike '%' || replace(replace(replace(trim(q.raw), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or similarity(p.title, q.raw) > 0.3
      or exists (select 1 from categories c where c.id = p.category_id and c.name ilike trim(q.raw) || '%')
   order by
     case when trim(q.raw) = '' then 0
          else ts_rank(p.search, websearch_to_tsquery('english', q.raw)) + similarity(p.title, q.raw) end desc,
     p.score desc, p.created_at desc
$$;

create or replace function public.search_businesses(p_q text) returns setof public.businesses
language sql stable set search_path = public, extensions as $$
  with q as (select trim(left(regexp_replace(coalesce(p_q, ''), '\s+', ' ', 'g'), 80)) as raw)
  select b.* from businesses b, q
   where q.raw = ''
      or b.name ilike '%' || replace(replace(replace(q.raw, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or b.tagline ilike '%' || replace(replace(replace(q.raw, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or similarity(b.name, q.raw) > 0.3
      or exists (select 1 from categories c where c.id = b.category_id and c.name ilike q.raw || '%')
   order by case when q.raw = '' then 0 else similarity(b.name, q.raw) end desc, b.rating_count desc
$$;

create or replace function public.business_response_stats(p_business_id uuid)
returns table(conversations int, response_rate numeric, avg_response_minutes int)
language sql stable security definer set search_path = public as $$
  with b as (select owner_id from businesses where id = p_business_id),
  firsts as (
    select c.id,
      (select min(m.created_at) from messages m where m.conversation_id = c.id and m.sender_id = c.buyer_id) as asked_at
    from conversations c where c.business_id = p_business_id and c.created_at > now() - interval '120 days'
  ),
  replies as (
    select f.id, f.asked_at,
      (select min(m.created_at) from messages m, b where m.conversation_id = f.id and m.sender_id = b.owner_id and m.created_at > f.asked_at) as replied_at
    from firsts f where f.asked_at is not null
  )
  select count(*)::int,
         case when count(*) = 0 then null else round(count(replied_at)::numeric / count(*), 2) end,
         (avg(extract(epoch from (replied_at - asked_at)) / 60) filter (where replied_at is not null))::int
  from replies
$$;

create or replace function public.marketplace_counts() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NOT_ALLOWED'; end if;
  return json_build_object(
    'users', (select count(*) from profiles where not is_demo),
    'active_users_30d', (select count(distinct buyer_id) from orders where created_at > now() - interval '30 days' and not is_demo),
    'sellers', (select count(*) from businesses where status = 'active' and not is_demo),
    'unverified_sellers', (select count(*) from businesses where not verified and status = 'active'),
    'listings', (select count(*) from products where status = 'active' and not is_demo),
    'orders_30d', (select count(*) from orders where created_at > now() - interval '30 days' and not is_demo),
    'open_reports', (select count(*) from reports where status in ('open','reviewing')),
    'demo_rows', (select count(*) from products where is_demo)
  );
end $$;
