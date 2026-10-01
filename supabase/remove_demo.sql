begin;
delete from public.reviews where is_demo;
delete from public.messages where is_demo;
delete from public.conversations where is_demo;
delete from public.orders where is_demo;
delete from public.products where is_demo;
delete from public.businesses where is_demo;
delete from auth.users where email like '%@demo.cu-marketplace.local';
commit;
