-- CU Marketplace — 0006 let either party of an order open its conversation.
-- start_conversation() is buyer-initiated (a seller can't message their own store); sellers reply to orders through this.
create or replace function public.start_order_conversation(p_order_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_order orders; v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found or not (v_order.buyer_id = v_uid or owns_business(v_order.business_id)) then raise exception 'NOT_FOUND'; end if;

  select id into v_id from conversations
   where buyer_id = v_order.buyer_id and business_id = v_order.business_id and order_id = p_order_id
   limit 1;
  if v_id is not null then return v_id; end if;

  insert into conversations (buyer_id, business_id, product_id, order_id)
  values (v_order.buyer_id, v_order.business_id,
          (select product_id from order_items where order_id = p_order_id and product_id is not null limit 1),
          p_order_id)
  on conflict (buyer_id, business_id, product_id) do update set order_id = excluded.order_id
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.start_order_conversation(uuid) from anon;
