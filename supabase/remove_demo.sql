-- Removes every demo row created by supabase/seed.sql. Categories and locations are kept.
-- Orders that real users placed with demo sellers are removed too, since those sellers are going away.
begin;
delete from public.reviews where is_demo;
delete from public.messages where is_demo;
delete from public.conversations where is_demo;
delete from public.orders where is_demo or business_id in (select id from public.businesses where is_demo);
delete from public.products where is_demo;
delete from public.businesses where is_demo;
delete from auth.users where email like '%@demo.cu-marketplace.local';
commit;
