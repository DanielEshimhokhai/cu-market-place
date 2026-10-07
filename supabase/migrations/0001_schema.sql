-- CU Marketplace — 0001 schema
create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('student','staff','admin');
create type public.affiliation as enum ('student','staff');
create type public.listing_kind as enum ('product','service');
create type public.product_status as enum ('draft','active','paused','removed');
create type public.item_condition as enum ('new','like_new','used');
create type public.order_status as enum ('pending','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled');
create type public.fulfilment as enum ('pickup','delivery');
create type public.business_status as enum ('active','suspended');
create type public.seller_type as enum ('student','business');
create type public.location_zone as enum ('hostels','academic','central','other');
create type public.report_reason as enum ('fraud','wrong_product','counterfeit','harassment','spam','prohibited_item','other');
create type public.report_target as enum ('product','business','user','review');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'student',
  affiliation public.affiliation not null default 'student',
  cu_verified boolean not null default false,
  avatar_url text,
  notify_price_drop boolean not null default true,
  notify_back_in_stock boolean not null default true,
  notify_new_listings boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  zone public.location_zone not null,
  description text,
  map_x smallint not null check (map_x between 0 and 100),
  map_y smallint not null check (map_y between 0 and 100),
  sort smallint not null default 0
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind public.listing_kind not null default 'product',
  sort smallint not null default 0,
  is_active boolean not null default true
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,70}$'),
  name text not null check (char_length(name) between 2 and 60),
  tagline text check (char_length(tagline) <= 90),
  description text check (char_length(description) <= 1500),
  category_id uuid references public.categories(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  seller_type public.seller_type not null default 'student',
  verified boolean not null default false,
  status public.business_status not null default 'active',
  hours jsonb not null default '{}'::jsonb,
  offers_delivery boolean not null default false,
  delivery_note text check (char_length(delivery_note) <= 200),
  logo_url text,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_category_idx on public.businesses(category_id);
create index businesses_location_idx on public.businesses(location_id);
create index businesses_name_trgm on public.businesses using gin (name extensions.gin_trgm_ops);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  kind public.listing_kind not null default 'product',
  title text not null check (char_length(title) between 2 and 90),
  description text not null default '' check (char_length(description) <= 3000),
  category_id uuid references public.categories(id) on delete set null,
  price_kobo integer not null check (price_kobo >= 0 and price_kobo <= 1000000000),
  compare_at_kobo integer check (compare_at_kobo is null or compare_at_kobo > price_kobo),
  condition public.item_condition not null default 'new',
  stock integer check (stock is null or stock >= 0),            -- null = made to order / unlimited
  status public.product_status not null default 'active',
  pickup_location_id uuid references public.locations(id) on delete set null,
  allows_pickup boolean not null default true,
  allows_delivery boolean not null default false,
  delivery_note text check (char_length(delivery_note) <= 200),
  view_count integer not null default 0,
  order_count integer not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  score numeric generated always as (order_count * 3 + view_count / 20.0 + rating_avg * least(rating_count, 20)) stored,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')) stored,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allows_pickup or allows_delivery)
);
create index products_business_idx on public.products(business_id);
create index products_category_idx on public.products(category_id);
create index products_status_created_idx on public.products(status, created_at desc);
create index products_score_idx on public.products(score desc);
create index products_search_idx on public.products using gin (search);
create index products_title_trgm on public.products using gin (title extensions.gin_trgm_ops);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,               -- absolute https URL or storage object path in bucket product-images
  position smallint not null default 0,
  is_demo boolean not null default false
);
create index product_images_product_idx on public.product_images(product_id, position);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),     -- e.g. Size
  value text not null check (char_length(value) between 1 and 40),   -- e.g. 42
  stock integer check (stock is null or stock >= 0),
  price_delta_kobo integer not null default 0,
  position smallint not null default 0,
  is_demo boolean not null default false,
  unique (product_id, name, value)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  status public.order_status not null default 'pending',
  fulfilment public.fulfilment not null default 'pickup',
  subtotal_kobo integer not null default 0,
  note text check (char_length(note) <= 500),
  pickup_instructions text check (char_length(pickup_instructions) <= 500),
  payment_status text,              -- reserved for future payments
  payment_ref text,                 -- reserved for future payments
  confirmed_at timestamptz, ready_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index orders_business_idx on public.orders(business_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title_snapshot text not null,
  variant_snapshot text,
  image_snapshot text,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity between 1 and 20)
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  quality smallint check (quality between 1 and 5),
  communication smallint check (communication between 1 and 5),
  accuracy smallint check (accuracy between 1 and 5),
  fulfilment_rating smallint check (fulfilment_rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  is_hidden boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index reviews_product_idx on public.reviews(product_id, created_at desc);
create index reviews_business_idx on public.reviews(business_id, created_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  last_message_at timestamptz,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct (buyer_id, business_id, product_id)
);
create index conversations_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index conversations_business_idx on public.conversations(business_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create table public.saved_products (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_at_save_kobo integer,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table public.saved_businesses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,   -- order_update | message | price_drop | back_in_stock | new_listing | review | review_reminder | moderation
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports(status, created_at desc);

-- Public, non-sensitive identity for people (never exposes email/phone).
create view public.public_profiles as
  select id, full_name, avatar_url, cu_verified, affiliation from public.profiles;
grant select on public.public_profiles to anon, authenticated;
