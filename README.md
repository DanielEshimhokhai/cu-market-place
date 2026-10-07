# CU Marketplace

A campus marketplace and business directory for the Covenant University community: students and campus businesses list products and services, buyers discover them, order (split per seller), follow the order to pickup or delivery, and leave verified-purchase reviews.

Not an official Covenant University service.

## Stack

- Next.js 16 (App Router, Server Components, Server Actions, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 (design tokens in `app/globals.css`)
- Supabase: Auth (CU email + confirmation), Postgres with Row Level Security, Storage, Realtime
- Zod for validation, Vitest for unit tests, PGlite for local SQL verification

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API Keys, the **publishable/anon** key).
3. Apply the database, in order, either in the Supabase SQL editor or with the helper script:
   - `supabase/migrations/0001_schema.sql` … `0006_order_conversation.sql`
   - `supabase/seed.sql` (demo data, optional)
   - `supabase/tests/rls.sql` (security checks; rolls back, should finish without `FAIL:`)

   Helper: add `SUPABASE_DB_URL=<session pooler connection string>` to `.env.local` (never commit it), then
   `node scripts/apply-sql.mjs supabase/migrations/0001_schema.sql …`.
4. Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000`, redirect URL `http://localhost:3000/auth/callback`. Keep "Confirm email" on.
5. `npm run dev` and open http://localhost:3000.

**Make yourself an admin** after signing up:

```sql
update public.profiles set role = 'admin' where email = 'you@stu.cu.edu.ng';
```

**Email delivery:** Supabase's built-in email service is rate-limited (a few emails per hour) and meant for testing. Configure custom SMTP (Authentication → SMTP) before inviting real users.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests (domain logic, validation, cart, search params) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run lint` | ESLint (incl. React Compiler rules) |
| `npm run db:check` | Runs all migrations + seed + RLS tests against in-process Postgres (PGlite) with stubbed Supabase schemas |
| `npm run seed:build` | Regenerates `supabase/seed.sql` from `supabase/seed/data.mjs` |

## Demo data

`supabase/seed.sql` creates 20 businesses, 100 listings, ~160 orders, reviews and conversations, owned by demo users on `@demo.cu-marketplace.local` (they cannot sign in). Every demo row has `is_demo = true`. Remove it all before launch with `supabase/remove_demo.sql` (categories and locations are kept). The admin overview reminds you while demo listings exist.

## Architecture notes

- **Authorization lives in the database.** RLS policies restrict every table; server code uses the signed-in user's session, never a service key. Column-protection triggers stop users editing fields like `verified`, ratings or counters.
- **Money and stock are handled by `security definer` functions**: `place_orders` re-reads prices and stock, locks rows, splits the cart into one order per seller and decrements stock; `set_order_status` enforces allowed transitions per role and restores stock on cancellation. The client never sends prices.
- **Privacy:** public pages read people through the `public_profiles` view (name + verified flag only). Emails, phone numbers and per-order pickup instructions are visible only to the people involved.
- **Search:** `search_products` / `search_businesses` combine prefix full-text search, trigram similarity and seller/category matching, and are chained with PostgREST filters for browsing.
- **Realtime** is used for message threads and the notification bell; both are limited by RLS to the participants.

## Where future features plug in

- Payments / escrow: `orders.payment_status`, `orders.payment_ref` are reserved; `place_orders` is the single place an order is created.
- Campus delivery: `fulfilment = 'delivery'` and per-listing delivery notes already exist.
- Service bookings, tutors, rentals: `products.kind = 'service'` separates services from goods.
- Seller subscriptions / sponsored listings: add a `plan` to `businesses` and weight `products.score`.
