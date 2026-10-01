# CU Marketplace — Design Spec

Date: 2026-10-01
Status: Approved design, pending spec review

## 1. Intent

A trusted campus marketplace and business directory for the Covenant University community:
"Everything students are selling, buying, and looking for on campus, in one trusted marketplace."

Core loop every decision serves: **Discover → Understand → Trust → Order → Receive → Review.**

Success = a student on a phone can find an item, see price / seller / pickup spot / trust signals at a glance,
place an order (split per seller), follow its status, and review it after completion. Sellers can list and
fulfil without friction. Admins can verify sellers and act on reports.

Not an official Covenant University product; branding is "inspired by", never impersonating.

## 2. Scope

In scope (this build):
- Supabase schema, RLS, triggers, seed data (flagged `is_demo`)
- Auth: CU-email sign-up, email verification, sign-in, sign-out, password reset
- Home, Browse (filters/sort), Search (products / businesses / services, suggestions)
- Product detail, Seller storefront, Business directory, Location browsing
- Cart (client), checkout splitting into one order per business, order list + detail + timeline
- Seller: onboarding (create business), dashboard, products table (edit/pause/delete/duplicate),
  add/edit product with multi-image upload + reorder, orders management with status updates, settings
- Reviews (completed orders only, verified purchase), saved products/businesses,
  messaging (conversations with product/order context, quick prompts, realtime),
  notifications center, report flow
- Admin: overview counts, reports queue, listings moderation, seller verification, users, categories, reviews

Out of scope (architect for, don't build): payments, escrow, delivery logistics, subscriptions,
sponsored listings, discount codes, flash sales, bundles, referrals, loyalty, events, bookings, rentals,
Google OAuth (left as a config switch).

Orders are "pay on pickup / arrange with seller" — clearly stated in checkout.

## 3. Stack & Architecture

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres, Storage (`product-images`, `business-media` buckets), Realtime (messages, notifications)
- `@supabase/ssr` for cookie sessions; middleware refreshes session
- Reads: React Server Components querying Supabase as the signed-in user (RLS applies)
- Writes: Server Actions with Zod validation; never trust client authz
- Client components only for interactive pieces: search box, cart, gallery, bottom sheets, uploader, chat
- Cart persisted in localStorage (per device) until checkout; checkout is a single server action that
  re-reads prices/stock from DB, groups by business, creates orders atomically via a Postgres RPC
  (`place_orders`) so price/stock can't be spoofed
- Money stored as integer kobo; rendered as ₦ with grouping

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
`CU_EMAIL_DOMAINS` (default `stu.cu.edu.ng,covenantuniversity.edu.ng`).
No service-role key in the app; seed is SQL run in the Supabase SQL editor.

## 4. Data Model

Enums: `user_role (student, staff, admin)`, `product_status (draft, active, paused, removed)`,
`item_condition (new, like_new, used)`, `order_status (pending, confirmed, preparing, ready_for_pickup,
out_for_delivery, completed, cancelled)`, `fulfilment (pickup, delivery)`, `business_status (active, suspended)`,
`report_status (open, reviewing, resolved, dismissed)`, `report_reason (fraud, wrong_product, counterfeit,
harassment, spam, prohibited_item, other)`, `listing_kind (product, service)`.

Tables (all `id uuid pk default gen_random_uuid()`, `created_at timestamptz`, seedable ones have `is_demo bool default false`):

- `profiles` — id = auth.users.id; full_name, email (private), phone (private, nullable), role,
  affiliation (`student|staff`), cu_verified bool, avatar_url
- `locations` — slug, name, zone (`hostels`, `academic`, `central`, `other`), map_x, map_y (schematic map coords), sort
- `categories` — slug, name, kind (`product|service`), sort, is_active
- `businesses` — owner_id → profiles, slug unique, name, tagline, description, category_id,
  location_id, verified bool, status, hours jsonb (`{mon:[["09:00","18:00"]],...}`), offers_delivery, logo_url,
  response_rate numeric, avg_response_minutes int, rating_avg, rating_count (maintained by trigger)
- `products` — business_id, slug unique, kind, title, description, category_id, price_kobo int,
  compare_at_kobo nullable, condition, stock int, status, pickup_location_id, allows_pickup, allows_delivery,
  delivery_note, view_count, order_count, rating_avg, rating_count, search tsvector (generated)
- `product_images` — product_id, path, position
- `product_variants` — product_id, name (e.g. "Size"), value (e.g. "42"), stock, price_delta_kobo
- `orders` — number (bigserial-based display #), buyer_id, business_id, status, fulfilment,
  subtotal_kobo, note, pickup_instructions (private, set by seller), timestamps per status
- `order_items` — order_id, product_id, variant_id, title_snapshot, unit_price_kobo, quantity
- `order_events` — order_id, status, actor_id, created_at (timeline)
- `reviews` — order_id unique, product_id, business_id, author_id, rating 1–5,
  quality/communication/accuracy/fulfilment 1–5 nullable, body, is_hidden
- `conversations` — buyer_id, business_id, product_id nullable, order_id nullable, last_message_at;
  unique(buyer_id, business_id, product_id)
- `messages` — conversation_id, sender_id, body, product_id nullable, order_id nullable, read_at
- `saved_products` (user_id, product_id, price_at_save_kobo) / `saved_businesses` (user_id, business_id)
- `notifications` — user_id, type, title, body, href, read_at
- `reports` — reporter_id, target_type (`product|business|user|review`), target_id, reason, details, status,
  resolved_by, resolution_note

Triggers / functions:
- `handle_new_user` → insert profile; `cu_verified` = email confirmed AND domain in allowed list
- `sync_cu_verified` on auth.users email confirmation
- `place_orders(items jsonb, fulfilment, note)` security definer: validates stock/status, snapshots prices,
  groups by business, creates orders + items + first event, decrements stock, notifies sellers
- `set_order_status(order_id, status, instructions)`: allowed transitions only, by seller (or buyer cancel while pending);
  writes event, notifies buyer
- Review insert guard: order completed AND author is buyer; rating aggregates refreshed
- Saved product price/stock change → notification to savers
- `is_admin()` helper; `owns_business(business_id)` helper

RLS summary:
- Public read: categories, locations, active businesses, active products + images + variants, non-hidden reviews
- Profiles: self read/update (not role/cu_verified); public view `public_profiles` exposes name + verified only
- Businesses/products/images/variants: write only by owner; admin all
- Orders/items/events: buyer or owning seller read; writes only via functions
- Conversations/messages: participants only
- Saved/notifications: owner only
- Reports: reporter insert + read own; admin all
- Storage: public read; write only under `{business_id}/...` for owners

## 5. Auth

- Sign up: full name, CU email (domain validated client + server), affiliation, password (min 8), optional phone
- Supabase email confirmation → `/auth/callback` → home
- Badge "Covenant Verified" shown once on profile/seller headers and reviews, not everywhere
- `/sell/*` requires sign-in (onboarding creates business); `/admin/*` requires `role = admin` (server check)

## 6. Information Architecture

Desktop header: logo, search, Marketplace, Businesses, Orders, Saved, Sell, messages/notifications, cart, profile.
Mobile: compact header (logo, search trigger, cart) + bottom nav (Home, Browse, Orders, Saved, Profile).
Sell lives in Profile and Browse on mobile.

Routes: `/`, `/browse`, `/search`, `/p/[slug]`, `/b/[slug]`, `/businesses`, `/locations/[slug]`,
`/cart`, `/orders`, `/orders/[id]`, `/saved`, `/messages`, `/messages/[id]`, `/notifications`, `/account`,
`/auth/sign-in`, `/auth/sign-up`, `/auth/verify`, `/auth/callback`, `/auth/reset`,
`/sell`, `/sell/onboarding`, `/sell/products`, `/sell/products/new`, `/sell/products/[id]`, `/sell/orders`,
`/sell/orders/[id]`, `/sell/settings`, `/admin`, `/admin/reports`, `/admin/listings`, `/admin/sellers`,
`/admin/users`, `/admin/categories`, `/admin/reviews`.

## 7. Design System

- Type: Inter; scale 12/13/14/16/18/22/28; headings semibold, never oversized
- Color tokens: neutrals (warm stone: bg `#FAF9F7`, surface `#FFFFFF`, border `#E7E3DE`, text `#1C1B1A`,
  muted `#6B6662`), accent burgundy `#7A1F2B` (hover `#651924`), success muted green `#2F6B4F`,
  warning muted gold `#9A7B2F`, danger `#B42318`
- Radius 6 (controls) / 8 (cards, sheets); 1px borders; shadows only on popovers/sheets/modals
- Control heights 36 (sm) / 40 (md) / 44 (lg, mobile primary)
- Motion: 120–150ms color/opacity only; no bounce
- Components: Button, Input, Textarea, Select, Checkbox, SearchBar, ProductCard, BusinessCard, SellerBadge,
  VerifiedBadge, Rating, Price, FilterPanel, Modal, BottomSheet, Toast, Dropdown, Tabs, Avatar, Badge,
  ProductGallery, OrderTimeline, OrderStatusBadge, ReviewCard, EmptyState, Skeleton, ImageUploader, CampusMap

Product card: 4:5 image (lazy, `next/image`), title (2 lines max), price, seller name (+✓ if verified),
★ rating · location, availability only when low/out of stock. Save toggle on image corner.

## 8. Error Handling & States

- Every list has a designed EmptyState; every async route has `loading.tsx` skeletons; `error.tsx` per segment
- Server actions return `{ ok, error, fieldErrors }`; forms show inline errors; toasts for success
- Checkout surfaces per-item stock/price changes before placing
- Optimistic UI only for save toggles and message send

## 9. Seed Data

`supabase/seed.sql`: ~14 locations, 14 categories, 20 businesses (owned by demo seller profiles with
fabricated auth users using `@demo.cu-marketplace.local` emails that cannot sign in), ~100 products with
realistic naira prices, images from a small curated set of Unsplash photo URLs per category (each verified to load; products
without a fitting photo render the neutral image placeholder), reviews, a few orders.
All rows `is_demo = true`; `supabase/remove_demo.sql` deletes them.
Admin promotion: `update profiles set role='admin' where email = '<you>'` documented in README.

## 10. Testing / Verification

- `tsc --noEmit`, `next lint`, `next build`
- `supabase/tests/rls.sql`: impersonation checks (`set local role authenticated; set request.jwt.claims`)
  for key policies
- Manual browser walkthrough of the core loop on mobile (375px) and desktop widths

## 11. Future-proofing

`orders` has nullable `payment_status`/`payment_ref` columns reserved; `fulfilment` enum already includes
delivery; `listing_kind` separates services for later bookings; `businesses` can gain `plan` for subscriptions.
