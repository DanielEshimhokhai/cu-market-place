-- CU Marketplace — 0003 RLS
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_products enable row level security;
alter table public.saved_businesses enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- profiles: self or admin (public identity goes through public_profiles view)
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

-- reference data
create policy locations_read on public.locations for select using (true);
create policy locations_admin on public.locations for all using (public.is_admin()) with check (public.is_admin());
create policy categories_read on public.categories for select using (is_active or public.is_admin());
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- businesses
create policy businesses_read on public.businesses for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy businesses_insert on public.businesses for insert to authenticated
  with check (owner_id = auth.uid());
create policy businesses_update on public.businesses for update
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- products
create policy products_read on public.products for select using (
  (status = 'active' and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active'))
  or public.owns_business(business_id) or public.is_admin());
create policy products_insert on public.products for insert to authenticated with check (public.owns_business(business_id));
create policy products_update on public.products for update
  using (public.owns_business(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_admin());
create policy products_delete on public.products for delete using (public.owns_business(business_id) or public.is_admin());

create policy images_read on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id));   -- inherits products RLS
create policy images_write on public.product_images for all
  using (exists (select 1 from public.products p where p.id = product_id and public.owns_business(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.owns_business(p.business_id)));
create policy variants_read on public.product_variants for select using (
  exists (select 1 from public.products p where p.id = product_id));
create policy variants_write on public.product_variants for all
  using (exists (select 1 from public.products p where p.id = product_id and public.owns_business(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.owns_business(p.business_id)));

-- orders: read by buyer, owning seller, admin. Writes only via functions.
create policy orders_read on public.orders for select
  using (buyer_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy order_items_read on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy order_events_read on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id));

-- reviews
create policy reviews_read on public.reviews for select using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy reviews_insert on public.reviews for insert to authenticated with check (author_id = auth.uid());
create policy reviews_admin_update on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy reviews_admin_delete on public.reviews for delete using (public.is_admin());

-- conversations & messages: participants only
create policy conversations_read on public.conversations for select
  using (buyer_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy messages_read on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and (c.buyer_id = auth.uid() or public.owns_business(c.business_id))));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id
               and (c.buyer_id = auth.uid() or public.owns_business(c.business_id))));

-- saved
create policy saved_products_own on public.saved_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_businesses_own on public.saved_businesses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
create policy notifications_admin_insert on public.notifications for insert with check (public.is_admin());

-- reports
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_read on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update using (public.is_admin()) with check (public.is_admin());

-- execute grants for RPCs
revoke execute on function public.marketplace_counts() from anon;
revoke execute on function public.place_orders(jsonb, jsonb) from anon;
revoke execute on function public.set_order_status(uuid, public.order_status, text) from anon;
revoke execute on function public.start_conversation(uuid, uuid, uuid) from anon;

-- realtime
alter publication supabase_realtime add table public.messages, public.notifications;

-- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
       ('business-media', 'business-media', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select
  using (bucket_id in ('product-images','business-media'));
create policy "media owner write" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','business-media')
              and public.owns_business(((storage.foldername(name))[1])::uuid));
create policy "media owner update" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','business-media') and public.owns_business(((storage.foldername(name))[1])::uuid));
create policy "media owner delete" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','business-media') and public.owns_business(((storage.foldername(name))[1])::uuid));
