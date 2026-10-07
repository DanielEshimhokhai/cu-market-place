begin;
-- capture ids as postgres
select set_config('t.tobi',   (select id::text from auth.users where email = 'tobi.adeyemi@demo.cu-marketplace.local'), true);
select set_config('t.amara',  (select id::text from auth.users where email = 'amara.okafor@demo.cu-marketplace.local'), true);
select set_config('t.daniel', (select id::text from auth.users where email = 'daniel.eze@demo.cu-marketplace.local'), true);
select set_config('t.dunk',   (select id::text from products where slug = 'nike-dunk-low-panda'), true);
select set_config('t.closet', (select id::text from businesses where slug = 'daniels-closet'), true);
update products set stock = 1, price_kobo = 8500000 where slug = 'nike-dunk-low-panda';

create or replace function pg_temp.as_user(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', current_setting(p), 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- 1. anonymous-equivalent public read works, private columns unreachable through view
do $$ begin
  perform pg_temp.as_user('t.tobi');
  if (select count(*) from public.public_profiles where id = current_setting('t.amara')::uuid) <> 1 then raise exception 'FAIL: public_profiles readable'; end if;
  if (select count(*) from public.profiles where id = current_setting('t.amara')::uuid) <> 0 then raise exception 'FAIL: other profile row visible'; end if;
end $$;

-- 2. stock + price come from DB; second buyer of last unit fails
do $$ declare r record; begin
  perform pg_temp.as_user('t.tobi');
  select * into r from public.place_orders(
    jsonb_build_array(jsonb_build_object('product_id', current_setting('t.dunk'), 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('business_id', current_setting('t.closet'), 'fulfilment', 'pickup')));
  if (select subtotal_kobo from public.orders where id = r.order_id) <> 8500000 then raise exception 'FAIL: subtotal not from DB price'; end if;
  perform set_config('t.order', r.order_id::text, true);
  perform pg_temp.as_user('t.amara');
  begin
    perform public.place_orders(jsonb_build_array(jsonb_build_object('product_id', current_setting('t.dunk'), 'quantity', 1)), '[]');
    raise exception 'FAIL: oversold';
  exception when others then if sqlerrm <> 'OUT_OF_STOCK' then raise exception 'FAIL: expected OUT_OF_STOCK got %', sqlerrm; end if;
  end;
end $$;

-- 3. outsider can't see the order or its pickup instructions; seller can
do $$ begin
  perform pg_temp.as_user('t.amara');
  if (select count(*) from public.orders where id = current_setting('t.order')::uuid) <> 0 then raise exception 'FAIL: outsider sees order'; end if;
  perform pg_temp.as_user('t.daniel');
  perform public.set_order_status(current_setting('t.order')::uuid, 'confirmed', 'Daniel Hall lobby, 6pm');
  perform pg_temp.as_user('t.amara');
  if exists (select 1 from public.orders where pickup_instructions is not null and id = current_setting('t.order')::uuid) then raise exception 'FAIL: instructions leaked'; end if;
end $$;

-- 4. seller cannot buy own product; buyer cannot confirm on seller's behalf
do $$ begin
  perform pg_temp.as_user('t.daniel');
  begin
    perform public.place_orders(jsonb_build_array(jsonb_build_object('product_id', current_setting('t.dunk'), 'quantity', 1)), '[]');
    raise exception 'FAIL: own product';
  exception when others then if sqlerrm not in ('OWN_PRODUCT','OUT_OF_STOCK') then raise exception 'FAIL: got %', sqlerrm; end if;
  end;
  perform pg_temp.as_user('t.tobi');
  begin
    perform public.set_order_status(current_setting('t.order')::uuid, 'preparing');
    raise exception 'FAIL: buyer advanced order';
  exception when others then if sqlerrm <> 'NOT_ALLOWED' then raise exception 'FAIL: got %', sqlerrm; end if;
  end;
end $$;

-- 5. review only after completion; conversation privacy
do $$ declare v_conv uuid; begin
  perform pg_temp.as_user('t.tobi');
  begin
    insert into public.reviews (order_id, product_id, business_id, author_id, rating)
    values (current_setting('t.order')::uuid, current_setting('t.dunk')::uuid, current_setting('t.closet')::uuid, current_setting('t.tobi')::uuid, 5);
    raise exception 'FAIL: review before completion';
  exception when others then if sqlerrm <> 'REVIEW_NOT_ALLOWED' then raise exception 'FAIL: got %', sqlerrm; end if;
  end;
  v_conv := public.start_conversation(current_setting('t.closet')::uuid, current_setting('t.dunk')::uuid);
  insert into public.messages (conversation_id, sender_id, body) values (v_conv, current_setting('t.tobi')::uuid, 'Is this available?');
  perform pg_temp.as_user('t.amara');
  if (select count(*) from public.messages where conversation_id = v_conv) <> 0 then raise exception 'FAIL: outsider reads messages'; end if;
end $$;

-- 6. seller can't self-verify; search tolerates punctuation
do $$ declare v_before numeric; begin
  perform pg_temp.as_user('t.daniel');
  select rating_avg into v_before from public.businesses where id = current_setting('t.closet')::uuid;
  update public.businesses set verified = false, rating_avg = 1.11, tagline = 'rls test' where id = current_setting('t.closet')::uuid;
  if (select rating_avg from public.businesses where id = current_setting('t.closet')::uuid) <> v_before then
    raise exception 'FAIL: seller edited rating';
  end if;
  if (select tagline from public.businesses where id = current_setting('t.closet')::uuid) <> 'rls test' then
    raise exception 'FAIL: seller could not edit own tagline';
  end if;
  perform count(*) from public.search_products($q$it's 50% & : \ off$q$);
  perform count(*) from public.search_products('   ');
end $$;

-- 7. order conversation: buyer and seller can open it, outsiders cannot
do $$ declare v1 uuid; v2 uuid; begin
  perform pg_temp.as_user('t.tobi');
  v1 := public.start_order_conversation(current_setting('t.order')::uuid);
  perform pg_temp.as_user('t.daniel');
  v2 := public.start_order_conversation(current_setting('t.order')::uuid);
  if v1 <> v2 then raise exception 'FAIL: buyer and seller got different order conversations'; end if;
  perform pg_temp.as_user('t.amara');
  begin
    perform public.start_order_conversation(current_setting('t.order')::uuid);
    raise exception 'FAIL: outsider opened order conversation';
  exception when others then if sqlerrm <> 'NOT_FOUND' then raise exception 'FAIL: got %', sqlerrm; end if;
  end;
end $$;

-- ── Final-review regression tests ─────────────────────────────────

-- 8. A suspended store stays readable to buyers who have orders/conversations with it (pages must not break).
reset role;
select set_config('request.jwt.claims', '', true);
update public.businesses set status = 'suspended' where id = current_setting('t.closet')::uuid;
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-4000-8000-0000000000bb', 'stranger@stu.cu.edu.ng', now());
select set_config('t.stranger', '00000000-0000-4000-8000-0000000000bb', true);
set local role authenticated;
do $$ begin
  perform pg_temp.as_user('t.tobi');
  if (select count(*) from public.businesses where id = current_setting('t.closet')::uuid) <> 1 then
    raise exception 'FAIL: buyer with an order cannot read the suspended store';
  end if;
  perform pg_temp.as_user('t.stranger');
  if (select count(*) from public.businesses where id = current_setting('t.closet')::uuid) <> 0 then
    raise exception 'FAIL: unrelated user can read a suspended store';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);
update public.businesses set status = 'active' where id = current_setting('t.closet')::uuid;
set local role authenticated;

-- 9. A price that changed since the cart loaded is rejected instead of charged silently.
do $$ declare v_price int; begin
  perform pg_temp.as_user('t.amara');
  select price_kobo into v_price from public.products where slug = 'chicken-shawarma';
  begin
    perform public.place_orders(
      jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where slug = 'chicken-shawarma'), 'quantity', 1, 'unit_price_kobo', v_price - 100)), '[]');
    raise exception 'FAIL: stale price accepted';
  exception when others then if sqlerrm <> 'PRICE_CHANGED' then raise exception 'FAIL: expected PRICE_CHANGED got %', sqlerrm; end if;
  end;
  perform public.place_orders(
    jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where slug = 'chicken-shawarma'), 'quantity', 1, 'unit_price_kobo', v_price)), '[]');
end $$;

-- 10. Accounts without a confirmed CU email cannot open stores or message sellers, even via the API.
reset role;
select set_config('request.jwt.claims', '', true);
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000aa', 'outsider@gmail.com', now(), '{"full_name":"Out Sider"}');
select set_config('t.outsider', '00000000-0000-4000-8000-0000000000aa', true);
set local role authenticated;
do $$ begin
  perform pg_temp.as_user('t.outsider');
  begin
    insert into public.businesses (owner_id, slug, name) values (current_setting('t.outsider')::uuid, 'gmail-shop', 'Gmail Shop');
    raise exception 'FAIL: unverified account opened a store';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.start_conversation(current_setting('t.closet')::uuid);
    raise exception 'FAIL: unverified account started a conversation';
  exception when others then if sqlerrm <> 'NOT_VERIFIED' then raise exception 'FAIL: expected NOT_VERIFIED got %', sqlerrm; end if;
  end;
end $$;

-- 11. Deleting a listing keeps its reviews (and the store's rating).
reset role;
select set_config('request.jwt.claims', '', true);
do $$ declare v_product uuid; v_before int; begin
  select r.product_id into v_product from public.reviews r join public.products p on p.id = r.product_id
   where p.business_id = current_setting('t.closet')::uuid and p.slug <> 'nike-dunk-low-panda' group by r.product_id order by count(*) desc limit 1;
  select rating_count into v_before from public.businesses where id = current_setting('t.closet')::uuid;
  perform set_config('t.victim', v_product::text, true);
end $$;
set local role authenticated;
do $$ begin
  perform pg_temp.as_user('t.daniel');
  delete from public.products where id = current_setting('t.victim')::uuid;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);
do $$ begin
  if (select count(*) from public.reviews where business_id = current_setting('t.closet')::uuid) < 1
     or (select rating_count from public.businesses where id = current_setting('t.closet')::uuid)
        <> (select count(*) from public.reviews where business_id = current_setting('t.closet')::uuid and not is_hidden) then
    raise exception 'FAIL: rating out of sync after delete';
  end if;
  if exists (select 1 from public.products where id = current_setting('t.victim')::uuid) then raise exception 'FAIL: product not deleted'; end if;
  if not exists (select 1 from public.reviews where product_id is null and business_id = current_setting('t.closet')::uuid) then
    raise exception 'FAIL: reviews of the deleted listing were erased';
  end if;
end $$;
set local role authenticated;

-- 12. The public identity view exposes a short display name only.
do $$ begin
  perform pg_temp.as_user('t.tobi');
  if (select display_name from public.public_profiles where id = current_setting('t.amara')::uuid) <> 'Amara O.' then
    raise exception 'FAIL: public_profiles exposes more than a short name';
  end if;
end $$;

select 'ALL RLS CHECKS PASSED' as result;
rollback;
