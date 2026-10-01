# CU Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality campus marketplace + business directory for the Covenant University community, centred on the loop Discover → Understand → Trust → Order → Receive → Review.

**Architecture:** Next.js App Router. Server Components read Supabase as the signed-in user (RLS enforces access); Server Actions validate with Zod and call Postgres; all money/stock-critical writes go through `security definer` Postgres functions (`place_orders`, `set_order_status`, `start_conversation`). Client components only where interaction requires it. Cart lives in localStorage until checkout.

**Tech Stack:** Next.js (latest, App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres 15+, Storage, Realtime) · `@supabase/ssr` · Zod · lucide-react · Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-cu-marketplace-design.md`

## Global Constraints

- Supabase project URL: `https://olqhnihinowwkvdlobxs.supabase.co`. Only the anon/publishable key is used by the app. No service-role key anywhere in the repo.
- SQL is applied by the user in the Supabase SQL editor, in file order: `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_policies.sql`, then `supabase/seed.sql`. `supabase/remove_demo.sql` deletes all demo rows.
- Money is stored as integer **kobo**; rendered with `formatNaira` (e.g. `₦85,000`).
- Allowed CU email domains: `stu.cu.edu.ng`, `covenantuniversity.edu.ng`. These must be identical in `NEXT_PUBLIC_CU_EMAIL_DOMAINS` (`.env.example`) and the SQL `cu_email_domains()` function.
- Every seeded row that is not reference data has `is_demo = true`. Reference data (`categories`, `locations`) is not demo data.
- Visual tokens are taken verbatim from the spec: bg `#FAF9F7`, surface `#FFFFFF`, border `#E7E3DE`, text `#1C1B1A`, muted `#6B6662`, accent `#7A1F2B` (hover `#651924`), success `#2F6B4F`, warning `#9A7B2F`, danger `#B42318`. Radius 6 for controls and 8 for cards/sheets. Control heights 36/40/44. Inter.
- No gradients, glassmorphism, decorative blobs, emoji in UI chrome, or invented statistics. If there's no data, show an empty state.
- Motion: only 120–150ms color/opacity/transform transitions. No bounce or spin, except the spinner inside a pending button.
- The UI must never say or imply that this is an official Covenant University product.
- Private data that must never appear in public queries: `profiles.email`, `profiles.phone`, `orders.pickup_instructions`. Public pages read people through the `public_profiles` view only.
- Mobile-first. Every page must work at 360px with no horizontal scroll. Mobile bottom nav: Home, Browse, Orders, Saved, Profile.
- Next.js 15+: route `params`/`searchParams` are Promises and must be awaited. If the installed Next is ≥16, the request interceptor file is `proxy.ts` exporting `proxy`. Otherwise it's `middleware.ts` exporting `middleware`.

**Deliberate refinements of the spec (decided while planning):**
- Reviews are unique per `(order_id, product_id)` rather than per order, so every item in a multi-item order can be reviewed.
- Seller response rate and average response time are computed from real messages by `business_response_stats()`, not stored in columns. They're hidden until the business has at least 3 buyer conversations.
- `businesses.seller_type` (`student` | `business`) backs the "Seller type" filter.
- "Saved item price changed" notifications fire only when the price drops. Followers (`saved_businesses`) are notified when the business lists something new.
- Profiles get notification preferences: `notify_price_drop`, `notify_back_in_stock`, `notify_new_listings`.

## Review Focus

1. **Last unit / overselling.** Two carts each hold the last unit. `place_orders` locks product rows `for update` and raises `OUT_OF_STOCK` for the second. A cart quantity above stock is rejected. Pinned in Task 5 `supabase/tests/rls.sql` (stock check).
2. **Stale cart price.** The seller changed the price after the item was added. The order must use the DB price, and checkout shows "Price updated" before placing. Pinned in Task 5 (order subtotal equals the DB price, not the client's) and Task 17 (reconcile UI).
3. **Seller buying their own listing.** The function raises `OWN_PRODUCT`, and the product page hides "Add to cart" for the owner. Pinned in Task 5.
4. **Outsider reads someone else's order, conversation or pickup instructions.** RLS returns 0 rows. Pinned in Task 5.
5. **Search input with punctuation (`'`, `&`, `:`, `%`, `\`) or only whitespace.** Nothing crashes, and an empty query shows suggestions instead of a SQL error. Pinned in Task 2 (`normalizeQuery`) and Task 5 (`search_products` with `'&:%`).

---

## File Map

```
app/
  layout.tsx, globals.css, not-found.tsx, error.tsx
  (shop)/layout.tsx                      header + bottom nav shell
  (shop)/page.tsx                        home
  (shop)/browse/page.tsx                 marketplace + filters
  (shop)/search/page.tsx                 search results (tabs)
  (shop)/p/[slug]/page.tsx               product detail
  (shop)/b/[slug]/page.tsx               storefront
  (shop)/businesses/page.tsx             directory
  (shop)/locations/page.tsx              campus map + location list
  (shop)/locations/[slug]/page.tsx       location detail
  (shop)/cart/page.tsx
  (shop)/orders/page.tsx, orders/[id]/page.tsx
  (shop)/saved/page.tsx
  (shop)/messages/page.tsx, messages/[id]/page.tsx
  (shop)/notifications/page.tsx
  (shop)/account/page.tsx
  auth/sign-in, sign-up, verify, reset, update-password pages; auth/callback/route.ts; auth/actions.ts
  sell/layout.tsx, page.tsx, onboarding/, products/, products/new/, products/[id]/, orders/, orders/[id]/, settings/
  admin/layout.tsx, page.tsx, reports/, listings/, sellers/, users/, categories/, reviews/
  api/search/suggest/route.ts
components/ui/        Button, Input, Textarea, Select, Checkbox, Badge, Avatar, Tabs, Modal, BottomSheet,
                      Toast(+provider), Dropdown, Skeleton, EmptyState, Field, Spinner
components/market/    ProductCard, ProductGrid, BusinessCard, Price, Rating, VerifiedBadge, SellerLine,
                      OpenStatus, LocationLabel, SaveButton, FilterPanel, SortSelect, SearchBar,
                      ProductGallery, VariantPicker, QuantityStepper, OrderTimeline, OrderStatusBadge,
                      ReviewCard, ReviewSummary, CampusMap, ReportDialog, CategoryRail
components/layout/    SiteHeader, MobileNav, SiteFooter, AccountMenu, CartButton, NotificationBell
components/sell/      SellerNav, StatTile, ProductsTable, ProductForm, ImageUploader, HoursEditor, OrderActions
components/admin/     AdminNav, DataTable
lib/
  supabase/server.ts, client.ts, session.ts (updateSession)
  auth.ts             getUser(), requireUser(), requireSeller(), requireAdmin()
  money.ts, email.ts, hours.ts, slug.ts, search.ts, names.ts, images.ts, time.ts
  orders/transitions.ts
  cart/cart.ts (pure), cart/store.tsx (client context)
  types.ts            domain types
  queries/            catalog.ts, businesses.ts, search.ts, orders.ts, seller.ts, reviews.ts,
                      saved.ts, messages.ts, notifications.ts, admin.ts, reference.ts
  actions/            cart.ts(checkout), orders.ts, products.ts, business.ts, reviews.ts, saved.ts,
                      messages.ts, notifications.ts, reports.ts, admin.ts, account.ts
supabase/migrations/0001_schema.sql, 0002_functions.sql, 0003_policies.sql
supabase/seed/data.mjs, supabase/seed/build.mjs → supabase/seed.sql
supabase/remove_demo.sql, supabase/tests/rls.sql
tests/ (vitest)       money, email, hours, slug, search, transitions, cart, names
proxy.ts | middleware.ts
```

---

### Task 1: Scaffold project and design tokens

**Files:**
- Create: Next.js app at repo root (keep `docs/`), `.env.example`, `.env.local` (gitignored, user fills key), `vitest.config.ts`, `lib/cn.ts`, `tests/smoke.test.ts`
- Modify: `app/globals.css`, `app/layout.tsx`, `next.config.ts`, `package.json`

**Interfaces:**
- Produces: `cn(...classes)` from `lib/cn.ts`. Tailwind theme tokens: `bg-canvas`, `bg-surface`, `border-line`, `text-ink`, `text-muted`, `bg-accent`/`text-accent`, `hover:bg-accent-hover`, `text-success`, `text-warning`, `text-danger`, `bg-subtle` (`#F3F1EE`), radius `rounded-control` (6px) / `rounded-card` (8px).

- [ ] **Step 1: Scaffold** in a temp dir and move it in, since the root isn't empty:

```bash
npx create-next-app@latest .scaffold --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cp -r .scaffold/. . && rm -rf .scaffold
npm i @supabase/supabase-js @supabase/ssr zod lucide-react clsx
npm i -D vitest
```

- [ ] **Step 2: Tokens.** Replace `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --color-canvas: #FAF9F7;
  --color-surface: #FFFFFF;
  --color-subtle: #F3F1EE;
  --color-line: #E7E3DE;
  --color-line-strong: #D6D0C9;
  --color-ink: #1C1B1A;
  --color-muted: #6B6662;
  --color-faint: #9A948E;
  --color-accent: #7A1F2B;
  --color-accent-hover: #651924;
  --color-accent-soft: #F6ECEE;
  --color-success: #2F6B4F;
  --color-success-soft: #EAF2EE;
  --color-warning: #9A7B2F;
  --color-warning-soft: #F7F1E3;
  --color-danger: #B42318;
  --color-danger-soft: #FBECEA;
  --radius-control: 6px;
  --radius-card: 8px;
  --shadow-overlay: 0 8px 24px -6px rgb(28 27 26 / 0.18), 0 2px 6px rgb(28 27 26 / 0.06);
}

html { -webkit-text-size-adjust: 100%; }
body { background: var(--color-canvas); color: var(--color-ink); font-feature-settings: "cv11", "ss01"; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.tabular { font-variant-numeric: tabular-nums; }
.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }
```

- [ ] **Step 3: Root layout.** Load `Inter` via `next/font/google` with `variable: "--font-inter"`. Use `<html lang="en">`, and give `<body>` `font-sans antialiased`. Metadata: title template `%s · CU Marketplace`, default `CU Marketplace`, description "Products, services and student businesses around Covenant University." `viewport.themeColor = "#FAF9F7"`.

- [ ] **Step 4: next.config.ts** — `images.remotePatterns`: `{ protocol: "https", hostname: "images.unsplash.com" }` and `{ protocol: "https", hostname: "olqhnihinowwkvdlobxs.supabase.co", pathname: "/storage/v1/object/public/**" }`.

- [ ] **Step 5: env + vitest.**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://olqhnihinowwkvdlobxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CU_EMAIL_DOMAINS=stu.cu.edu.ng,covenantuniversity.edu.ng
```
Copy it to `.env.local` and make sure `.env*.local` is gitignored.

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```
Add `"test": "vitest run"` and `"typecheck": "tsc --noEmit"` to package.json scripts.

`lib/cn.ts`:
```ts
import clsx, { type ClassValue } from "clsx";
export const cn = (...v: ClassValue[]) => clsx(v);
```

`tests/smoke.test.ts`:
```ts
import { cn } from "@/lib/cn";
import { test, expect } from "vitest";
test("cn joins truthy classes", () => expect(cn("a", false && "b", "c")).toBe("a c"));
```

- [ ] **Step 6: Verify.** `npm test` passes. `npm run typecheck` passes. `npm run build` succeeds.
- [ ] **Step 7: Commit** `chore: scaffold Next.js app with design tokens`.

---

### Task 2: Pure domain helpers (TDD)

**Files:**
- Create: `lib/money.ts`, `lib/email.ts`, `lib/hours.ts`, `lib/slug.ts`, `lib/search.ts`, `lib/names.ts`, `lib/orders/transitions.ts`, `lib/cart/cart.ts`, `lib/types.ts`
- Test: `tests/money.test.ts`, `tests/email.test.ts`, `tests/hours.test.ts`, `tests/slug.test.ts`, `tests/search.test.ts`, `tests/names.test.ts`, `tests/transitions.test.ts`, `tests/cart.test.ts`

**Interfaces (produced):**
```ts
// lib/money.ts
formatNaira(kobo: number): string                       // 8500000 -> "₦85,000", 150 -> "₦1.50"
nairaToKobo(input: string): number | null              // "85,000" -> 8500000; "abc" -> null
// lib/email.ts
cuDomains(): string[]
isCuEmail(email: string, domains?: string[]): boolean
// lib/hours.ts
type Weekday = "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"
type OpeningHours = Partial<Record<Weekday, [string, string][]>>
openStatus(hours: OpeningHours | null, now?: Date): { open: boolean; label: string }
formatTime(hhmm: string): string                       // "18:00" -> "6:00 PM"
WEEKDAYS: Weekday[]                                    // mon..sun
// lib/slug.ts
slugify(text: string): string
withSuffix(slug: string, suffix: string): string       // ("nike-dunk","a1b2") -> "nike-dunk-a1b2"
// lib/search.ts
normalizeQuery(q: string | null | undefined): string   // trims, collapses whitespace, max 80 chars
escapeLike(q: string): string                          // escapes % _ \
// lib/names.ts
shortName(fullName: string): string                    // "Tobi Adeyemi" -> "Tobi A."
initials(name: string): string                         // "Campus Bites" -> "CB"
// lib/orders/transitions.ts
type OrderStatus = "pending"|"confirmed"|"preparing"|"ready_for_pickup"|"out_for_delivery"|"completed"|"cancelled"
type Fulfilment = "pickup"|"delivery"
STATUS_LABEL: Record<OrderStatus, string>
sellerNextStatuses(s: OrderStatus, f: Fulfilment): OrderStatus[]
buyerCanCancel(s: OrderStatus): boolean
buyerCanConfirmReceipt(s: OrderStatus): boolean
timelineSteps(s: OrderStatus, f: Fulfilment): { key: string; label: string; state: "done"|"current"|"upcoming" }[]
// lib/cart/cart.ts
type CartLine = { productId: string; variantId: string | null; variantLabel: string | null; quantity: number;
  title: string; productSlug: string; imageUrl: string | null; unitPriceKobo: number;
  businessId: string; businessName: string; businessSlug: string;
  maxQuantity: number | null; allowsPickup: boolean; allowsDelivery: boolean }
MAX_LINE_QTY = 20
lineKey(l: Pick<CartLine,"productId"|"variantId">): string
addLine(lines: CartLine[], line: CartLine): CartLine[]
setQuantity(lines: CartLine[], key: string, qty: number): CartLine[]   // qty<=0 removes
removeLine(lines: CartLine[], key: string): CartLine[]
cartCount(lines: CartLine[]): number
groupBySeller(lines: CartLine[]): { businessId: string; businessName: string; businessSlug: string;
  lines: CartLine[]; subtotalKobo: number; deliveryAvailable: boolean; pickupAvailable: boolean }[]
```

`lib/types.ts` holds the domain row types consumed by queries/components:
```ts
import type { OpeningHours } from "./hours";
import type { OrderStatus, Fulfilment } from "./orders/transitions";
export type ListingKind = "product" | "service";
export type Condition = "new" | "like_new" | "used";
export type ProductStatus = "draft" | "active" | "paused" | "removed";
export type Category = { id: string; slug: string; name: string; kind: ListingKind; sort: number };
export type Location = { id: string; slug: string; name: string; zone: "hostels" | "academic" | "central" | "other"; map_x: number; map_y: number };
export type BusinessSummary = { id: string; slug: string; name: string; tagline: string | null; verified: boolean;
  seller_type: "student" | "business"; rating_avg: number; rating_count: number; hours: OpeningHours | null;
  logo_url: string | null; offers_delivery: boolean; category: Pick<Category, "slug" | "name"> | null;
  location: Pick<Location, "slug" | "name"> | null; product_count?: number };
export type ProductCardData = { id: string; slug: string; title: string; kind: ListingKind; price_kobo: number;
  compare_at_kobo: number | null; stock: number | null; condition: Condition; rating_avg: number; rating_count: number;
  image: string | null; business: Pick<BusinessSummary, "id" | "slug" | "name" | "verified">;
  location: Pick<Location, "slug" | "name"> | null };
export type { OrderStatus, Fulfilment };
```

- [ ] **Step 1: Write failing tests.**

`tests/money.test.ts`
```ts
import { describe, expect, test } from "vitest";
import { formatNaira, nairaToKobo } from "@/lib/money";
describe("formatNaira", () => {
  test("whole naira", () => expect(formatNaira(8_500_000)).toBe("₦85,000"));
  test("zero", () => expect(formatNaira(0)).toBe("₦0"));
  test("kobo shown when present", () => expect(formatNaira(150)).toBe("₦1.50"));
});
describe("nairaToKobo", () => {
  test("grouped", () => expect(nairaToKobo("85,000")).toBe(8_500_000));
  test("symbol + decimals", () => expect(nairaToKobo("₦1,250.5")).toBe(125_050));
  test("rejects junk", () => expect(nairaToKobo("12a")).toBeNull());
  test("rejects negative", () => expect(nairaToKobo("-5")).toBeNull());
  test("rejects empty", () => expect(nairaToKobo("  ")).toBeNull());
});
```

`tests/email.test.ts`
```ts
import { expect, test } from "vitest";
import { isCuEmail } from "@/lib/email";
const d = ["stu.cu.edu.ng", "covenantuniversity.edu.ng"];
test("student domain", () => expect(isCuEmail("tobi.adeyemi@stu.cu.edu.ng", d)).toBe(true));
test("case + whitespace", () => expect(isCuEmail("  Tobi@STU.CU.EDU.NG ", d)).toBe(true));
test("staff domain", () => expect(isCuEmail("a.b@covenantuniversity.edu.ng", d)).toBe(true));
test("lookalike subdomain rejected", () => expect(isCuEmail("x@evil.stu.cu.edu.ng", d)).toBe(false));
test("gmail rejected", () => expect(isCuEmail("x@gmail.com", d)).toBe(false));
test("no local part", () => expect(isCuEmail("@stu.cu.edu.ng", d)).toBe(false));
```

`tests/hours.test.ts` (Lagos is UTC+1, no DST; 2026-10-01 is a Thursday)
```ts
import { expect, test } from "vitest";
import { openStatus, formatTime } from "@/lib/hours";
const hours = { thu: [["09:00", "18:00"]], fri: [["10:00", "14:00"]] } as const;
const at = (utc: string) => new Date(utc);
test("open inside range", () =>
  expect(openStatus(hours as any, at("2026-10-01T10:00:00Z"))).toEqual({ open: true, label: "Open · closes 6:00 PM" }));
test("before opening same day", () =>
  expect(openStatus(hours as any, at("2026-10-01T06:00:00Z"))).toEqual({ open: false, label: "Closed · opens 9:00 AM" }));
test("after closing -> next day", () =>
  expect(openStatus(hours as any, at("2026-10-01T18:30:00Z"))).toEqual({ open: false, label: "Closed · opens Fri 10:00 AM" }));
test("no hours", () => expect(openStatus(null)).toEqual({ open: false, label: "Hours not set" }));
test("formatTime", () => { expect(formatTime("00:30")).toBe("12:30 AM"); expect(formatTime("12:00")).toBe("12:00 PM"); });
```

`tests/slug.test.ts`
```ts
import { expect, test } from "vitest";
import { slugify, withSuffix } from "@/lib/slug";
test("slugify", () => expect(slugify("  Nike Dunk Low — Panda (Size 42)! ")).toBe("nike-dunk-low-panda-size-42"));
test("apostrophes dropped", () => expect(slugify("Daniel's Closet")).toBe("daniels-closet"));
test("empty falls back", () => expect(slugify("!!!")).toBe("item"));
test("suffix", () => expect(withSuffix("nike-dunk", "a1b2")).toBe("nike-dunk-a1b2"));
```

`tests/search.test.ts`
```ts
import { expect, test } from "vitest";
import { normalizeQuery, escapeLike } from "@/lib/search";
test("trims and collapses", () => expect(normalizeQuery("  black   shirt ")).toBe("black shirt"));
test("null/whitespace -> empty", () => { expect(normalizeQuery(null)).toBe(""); expect(normalizeQuery("   ")).toBe(""); });
test("caps length", () => expect(normalizeQuery("a".repeat(200))).toHaveLength(80));
test("escapes like wildcards", () => expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\"));
```

`tests/names.test.ts`
```ts
import { expect, test } from "vitest";
import { shortName, initials } from "@/lib/names";
test("short name", () => expect(shortName("Tobi Adeyemi")).toBe("Tobi A."));
test("single name", () => expect(shortName("Tobi")).toBe("Tobi"));
test("blank", () => expect(shortName("  ")).toBe("Student"));
test("initials", () => { expect(initials("Campus Bites")).toBe("CB"); expect(initials("The Thrift Room")).toBe("TT"); });
```

`tests/transitions.test.ts`
```ts
import { expect, test } from "vitest";
import { sellerNextStatuses, buyerCanCancel, buyerCanConfirmReceipt, timelineSteps } from "@/lib/orders/transitions";
test("pending -> confirm/cancel", () => expect(sellerNextStatuses("pending", "pickup")).toEqual(["confirmed", "cancelled"]));
test("pickup skips delivery state", () =>
  expect(sellerNextStatuses("confirmed", "pickup")).toEqual(["preparing", "ready_for_pickup", "cancelled"]));
test("delivery skips pickup state", () =>
  expect(sellerNextStatuses("preparing", "delivery")).toEqual(["out_for_delivery", "cancelled"]));
test("terminal", () => { expect(sellerNextStatuses("completed", "pickup")).toEqual([]); expect(sellerNextStatuses("cancelled", "pickup")).toEqual([]); });
test("buyer cancel only pending", () => { expect(buyerCanCancel("pending")).toBe(true); expect(buyerCanCancel("confirmed")).toBe(false); });
test("buyer confirm receipt", () => { expect(buyerCanConfirmReceipt("ready_for_pickup")).toBe(true); expect(buyerCanConfirmReceipt("preparing")).toBe(false); });
test("timeline ready for pickup", () =>
  expect(timelineSteps("ready_for_pickup", "pickup").map((s) => `${s.label}:${s.state}`)).toEqual([
    "Order placed:done", "Seller confirmed:done", "Preparing:done", "Ready for pickup:current", "Completed:upcoming",
  ]));
test("timeline cancelled", () =>
  expect(timelineSteps("cancelled", "pickup").map((s) => `${s.label}:${s.state}`)).toEqual(["Order placed:done", "Cancelled:current"]));
test("timeline completed all done", () =>
  expect(timelineSteps("completed", "delivery").every((s) => s.state === "done")).toBe(true));
```

`tests/cart.test.ts`
```ts
import { expect, test } from "vitest";
import { addLine, setQuantity, removeLine, cartCount, groupBySeller, lineKey, type CartLine } from "@/lib/cart/cart";
const base = (o: Partial<CartLine>): CartLine => ({ productId: "p1", variantId: null, variantLabel: null, quantity: 1, title: "Dunk",
  productSlug: "dunk", imageUrl: null, unitPriceKobo: 1000, businessId: "b1", businessName: "Daniel's Closet", businessSlug: "daniels-closet",
  maxQuantity: null, allowsPickup: true, allowsDelivery: false, ...o });
test("merges same product+variant", () => expect(addLine([base({})], base({ quantity: 2 }))[0].quantity).toBe(3));
test("different variant is separate line", () => expect(addLine([base({})], base({ variantId: "v2" }))).toHaveLength(2));
test("clamps to stock", () => expect(addLine([base({ maxQuantity: 2 })], base({ quantity: 5, maxQuantity: 2 }))[0].quantity).toBe(2));
test("clamps to 20", () => expect(addLine([], base({ quantity: 50 }))[0].quantity).toBe(20));
test("setQuantity 0 removes", () => expect(setQuantity([base({})], lineKey(base({})), 0)).toEqual([]));
test("remove", () => expect(removeLine([base({})], "p1:")).toEqual([]));
test("count", () => expect(cartCount([base({ quantity: 2 }), base({ productId: "p2", quantity: 3 })])).toBe(5));
test("groups by seller preserving order, subtotals", () => {
  const g = groupBySeller([base({ quantity: 2 }), base({ productId: "p2", businessId: "b2", businessName: "Campus Bites", allowsDelivery: true }), base({ productId: "p3", unitPriceKobo: 500 })]);
  expect(g.map((x) => x.businessId)).toEqual(["b1", "b2"]);
  expect(g[0].subtotalKobo).toBe(2500);
  expect(g[0].deliveryAvailable).toBe(false);
  expect(g[1].deliveryAvailable).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL (modules not found).

- [ ] **Step 3: Implement.**

`lib/money.ts`
```ts
export function formatNaira(kobo: number): string {
  const hasKobo = kobo % 100 !== 0;
  return "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: hasKobo ? 2 : 0, maximumFractionDigits: 2 });
}
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
```

`lib/email.ts`
```ts
export const DEFAULT_CU_DOMAINS = ["stu.cu.edu.ng", "covenantuniversity.edu.ng"];
export function cuDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_CU_EMAIL_DOMAINS;
  const list = raw?.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  return list && list.length ? list : DEFAULT_CU_DOMAINS;
}
export function isCuEmail(email: string, domains: string[] = cuDomains()): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  return domains.includes(e.slice(at + 1));
}
```

`lib/hours.ts`
```ts
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OpeningHours = Partial<Record<Weekday, [string, string][]>>;
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const BY_UTC_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABEL: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** Lagos is UTC+1 year-round (no DST). */
function lagos(now: Date) {
  const s = new Date(now.getTime() + 60 * 60 * 1000);
  return { dayIndex: s.getUTCDay(), minutes: s.getUTCHours() * 60 + s.getUTCMinutes() };
}
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
export function openStatus(hours: OpeningHours | null, now: Date = new Date()): { open: boolean; label: string } {
  if (!hours || !WEEKDAYS.some((d) => hours[d]?.length)) return { open: false, label: "Hours not set" };
  const { dayIndex, minutes } = lagos(now);
  const today = hours[BY_UTC_DAY[dayIndex]] ?? [];
  for (const [o, c] of today) if (minutes >= toMin(o) && minutes < toMin(c)) return { open: true, label: `Open · closes ${formatTime(c)}` };
  const laterToday = today.filter(([o]) => toMin(o) > minutes).sort((a, b) => toMin(a[0]) - toMin(b[0]))[0];
  if (laterToday) return { open: false, label: `Closed · opens ${formatTime(laterToday[0])}` };
  for (let i = 1; i <= 7; i++) {
    const day = BY_UTC_DAY[(dayIndex + i) % 7];
    const first = [...(hours[day] ?? [])].sort((a, b) => toMin(a[0]) - toMin(b[0]))[0];
    if (first) return { open: false, label: `Closed · opens ${DAY_LABEL[day]} ${formatTime(first[0])}` };
  }
  return { open: false, label: "Hours not set" };
}
```

`lib/slug.ts`
```ts
export function slugify(text: string): string {
  const s = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return s || "item";
}
export const withSuffix = (slug: string, suffix: string) => `${slug}-${suffix}`;
```

`lib/search.ts`
```ts
export function normalizeQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => "\\" + c);
}
```

`lib/names.ts`
```ts
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Student";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
export function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
}
```

`lib/orders/transitions.ts`
```ts
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "completed" | "cancelled";
export type Fulfilment = "pickup" | "delivery";
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready_for_pickup", "out_for_delivery", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["completed"],
  completed: [], cancelled: [],
};
export function sellerNextStatuses(s: OrderStatus, f: Fulfilment): OrderStatus[] {
  return NEXT[s].filter((n) => !(n === "ready_for_pickup" && f !== "pickup") && !(n === "out_for_delivery" && f !== "delivery"));
}
export const buyerCanCancel = (s: OrderStatus) => s === "pending";
export const buyerCanConfirmReceipt = (s: OrderStatus) => s === "ready_for_pickup" || s === "out_for_delivery";
export function timelineSteps(s: OrderStatus, f: Fulfilment) {
  if (s === "cancelled") return [
    { key: "pending", label: "Order placed", state: "done" as const },
    { key: "cancelled", label: "Cancelled", state: "current" as const },
  ];
  const handoff: OrderStatus = f === "pickup" ? "ready_for_pickup" : "out_for_delivery";
  const order: { key: OrderStatus; label: string }[] = [
    { key: "pending", label: "Order placed" }, { key: "confirmed", label: "Seller confirmed" },
    { key: "preparing", label: "Preparing" }, { key: handoff, label: STATUS_LABEL[handoff] },
    { key: "completed", label: "Completed" },
  ];
  const idx = order.findIndex((o) => o.key === s);
  return order.map((o, i) => ({
    key: o.key, label: o.label,
    state: s === "completed" || i < idx ? ("done" as const) : i === idx ? ("current" as const) : ("upcoming" as const),
  }));
}
```

`lib/cart/cart.ts`
```ts
export type CartLine = { productId: string; variantId: string | null; variantLabel: string | null; quantity: number;
  title: string; productSlug: string; imageUrl: string | null; unitPriceKobo: number;
  businessId: string; businessName: string; businessSlug: string;
  maxQuantity: number | null; allowsPickup: boolean; allowsDelivery: boolean };
export const MAX_LINE_QTY = 20;
export const lineKey = (l: Pick<CartLine, "productId" | "variantId">) => `${l.productId}:${l.variantId ?? ""}`;
const clamp = (q: number, max: number | null) => Math.max(0, Math.min(q, MAX_LINE_QTY, max ?? Infinity));
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (!existing) return [...lines, { ...line, quantity: clamp(line.quantity, line.maxQuantity) }];
  return lines.map((l) => lineKey(l) === key ? { ...line, quantity: clamp(l.quantity + line.quantity, line.maxQuantity) } : l);
}
export function setQuantity(lines: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, key);
  return lines.map((l) => lineKey(l) === key ? { ...l, quantity: clamp(qty, l.maxQuantity) } : l);
}
export const removeLine = (lines: CartLine[], key: string) => lines.filter((l) => lineKey(l) !== key);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export function groupBySeller(lines: CartLine[]) {
  const map = new Map<string, { businessId: string; businessName: string; businessSlug: string; lines: CartLine[];
    subtotalKobo: number; deliveryAvailable: boolean; pickupAvailable: boolean }>();
  for (const l of lines) {
    const g = map.get(l.businessId) ?? { businessId: l.businessId, businessName: l.businessName, businessSlug: l.businessSlug,
      lines: [], subtotalKobo: 0, deliveryAvailable: true, pickupAvailable: true };
    g.lines.push(l); g.subtotalKobo += l.unitPriceKobo * l.quantity;
    g.deliveryAvailable &&= l.allowsDelivery; g.pickupAvailable &&= l.allowsPickup;
    map.set(l.businessId, g);
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Run** `npm test`. Expected: all PASS. Fix the implementation, not the tests, unless a test contradicts the spec.
- [ ] **Step 5: Commit** `feat: domain helpers for money, hours, orders, cart, search`.

---

### Task 3: Database schema (0001)

**Files:** Create `supabase/migrations/0001_schema.sql`

**Interfaces (produced):** the tables and enums below. Column names are used verbatim by every later task.

- [ ] **Step 1: Write the migration.**

```sql
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
```

- [ ] **Step 2: Static check.** Read the file through once and confirm every FK points at a table created earlier in the file. (It'll actually run in Task 6.)
- [ ] **Step 3: Commit** `feat(db): core schema`.

---

### Task 4: Functions & triggers (0002)

**Files:** Create `supabase/migrations/0002_functions.sql`

**Interfaces (produced, called by app via `supabase.rpc`):**
- `place_orders(p_items jsonb, p_groups jsonb) returns table(order_id uuid, order_number bigint, business_id uuid)`
  - `p_items`: `[{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]`
  - `p_groups`: `[{ "business_id": uuid, "fulfilment": "pickup"|"delivery", "note": string|null }]`
  - Raises one of: `NOT_AUTHENTICATED`, `NOT_VERIFIED`, `INVALID_CART`, `INVALID_QUANTITY`, `UNAVAILABLE`, `OWN_PRODUCT`, `INVALID_VARIANT`, `OUT_OF_STOCK`, `DELIVERY_UNAVAILABLE`, `PICKUP_UNAVAILABLE`
- `set_order_status(p_order_id uuid, p_status order_status, p_instructions text default null) returns orders`. Raises `NOT_AUTHENTICATED`, `NOT_FOUND`, `INVALID_TRANSITION`, `NOT_ALLOWED`.
- `start_conversation(p_business_id uuid, p_product_id uuid default null, p_order_id uuid default null) returns uuid`. Raises `NOT_AUTHENTICATED`, `OWN_BUSINESS`, `NOT_FOUND`.
- `mark_conversation_read(p_conversation_id uuid) returns void`
- `increment_product_view(p_product_id uuid) returns void`
- `search_products(p_q text) returns setof products` (security invoker, so RLS applies; chainable with PostgREST filters)
- `search_businesses(p_q text) returns setof businesses`
- `business_response_stats(p_business_id uuid) returns table(conversations int, response_rate numeric, avg_response_minutes int)`
- `marketplace_counts() returns json` (admin only)
- `is_admin()`, `owns_business(uuid)`, `cu_email_domains()`, `format_naira(int)`

- [ ] **Step 1: Write the migration.**

```sql
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
```

- [ ] **Step 2: Commit** `feat(db): ordering, review, messaging and search functions`.

---

### Task 5: RLS, storage policies, and SQL tests (0003)

**Files:** Create `supabase/migrations/0003_policies.sql` and `supabase/tests/rls.sql`

- [ ] **Step 1: Write the policies.**

```sql
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
```

- [ ] **Step 2: Write `supabase/tests/rls.sql`.** It runs after the seed, inside one transaction that rolls back, and every failed check raises `FAIL: ...`. It uses seed identities by email (Task 6 defines them: buyer `tobi.adeyemi@demo.cu-marketplace.local`, buyer `amara.okafor@demo.cu-marketplace.local`, seller `daniel.eze@demo.cu-marketplace.local`, who owns Daniel's Closet).

```sql
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

select 'ALL RLS CHECKS PASSED' as result;
rollback;
```

- [ ] **Step 3: Commit** `feat(db): row level security, storage policies, SQL tests`.

---

### Task 6: Seed data generator + user applies SQL

**Files:** Create `supabase/seed/data.mjs`, `supabase/seed/build.mjs`, generated `supabase/seed.sql`, `supabase/remove_demo.sql`, `scripts/check-images.mjs`. Modify `package.json` (`"seed:build": "node supabase/seed/build.mjs"`).

**Interfaces:** Produces deterministic demo identities used by Task 5's tests (`tobi.adeyemi@…`, `amara.okafor@…`, `daniel.eze@…`, product slug `nike-dunk-low-panda`, business slug `daniels-closet`).

**Reference data (in `data.mjs`, exact):**

Categories (`slug`, `name`, `kind`, sort order):
fashion Fashion product · food Food product · electronics Electronics product · beauty Beauty product · services Services service · books Books product · accessories Accessories product · school-essentials School Essentials product · thrift Thrift product · shoes Shoes product · hair-beauty Hair & Beauty service · photography Photography service · tech Tech product · laundry Laundry service · tutoring Tutoring service · other Other product

Locations (`slug`, `name`, `zone`, `map_x`, `map_y`). This is a schematic layout, not survey-accurate:
hostel-area-male "Hostel area (male halls)" hostels 18 30 · hostel-area-female "Hostel area (female halls)" hostels 80 30 · daniel-hall "Daniel Hall" hostels 12 22 · joseph-hall "Joseph Hall" hostels 20 18 · paul-hall "Paul Hall" hostels 26 24 · peter-hall "Peter Hall" hostels 14 36 · john-hall "John Hall" hostels 24 38 · esther-hall "Esther Hall" hostels 76 20 · mary-hall "Mary Hall" hostels 84 22 · deborah-hall "Deborah Hall" hostels 88 34 · lydia-hall "Lydia Hall" hostels 78 38 · dorcas-hall "Dorcas Hall" hostels 70 30 · student-centre "Student Centre" central 50 50 · cafeteria-1 "Cafeteria 1" central 40 44 · cafeteria-2 "Cafeteria 2" central 60 44 · chapel-area "University Chapel area" central 50 66 · library "Centre for Learning Resources" academic 42 76 · cst "College of Science & Technology" academic 30 70 · cmss "College of Management & Social Sciences" academic 64 74 · main-gate "Main gate" other 50 94

**The 20 businesses.** Owners are demo profiles. Each business has exactly 5 listings, so 100 products. Every product has a realistic title, a 1–3 sentence description, a price in naira, a condition, stock (null for services and made-to-order food), and 1–3 images (food, cakes and services may have 0–1). Shoes and clothing have Size variants.

| # | Business (slug) | Owner (email local-part) | Category | Seller type | Location | Delivery | Verified | Example listings & price range (₦) |
|---|---|---|---|---|---|---|---|---|
| 1 | Daniel's Closet (`daniels-closet`) | daniel.eze | fashion | student | daniel-hall | no | yes | **Nike Dunk Low "Panda" (`nike-dunk-low-panda`) 85,000**, oversized tees 9,500, cargo pants 18,000, hoodies 22,000, caps 6,500 |
| 2 | Campus Bites (`campus-bites`) | chioma.nwosu | food | business | cafeteria-2 | yes | yes | jollof rice & chicken 3,500, fried rice combo 3,800, chicken shawarma 3,000, spaghetti stir-fry 2,800, chapman 1,200 |
| 3 | CU Tech Hub (`cu-tech-hub`) | ibrahim.musa | electronics | business | student-centre | yes | yes | 20W USB-C charger 6,500, Oraimo earbuds 18,000, 10,000mAh power bank 14,500, laptop stand 12,000, Type-C cable 2,500 |
| 4 | Fresh Cuts (`fresh-cuts`) | seun.balogun | hair-beauty | student | peter-hall | no | yes | haircut 2,500, haircut + beard 3,500, line-up 1,500, dye 6,000, kids/family N/A → "hot towel shave" 2,000 |
| 5 | The Thrift Room (`the-thrift-room`) | ada.obi | thrift | student | esther-hall | no | yes | vintage denim jacket 12,000, thrift jeans 7,500, graphic tee 4,000, corduroy skirt 6,500, knit cardigan 8,000 |
| 6 | Sweet Crumbs by Ife (`sweet-crumbs`) | ife.akinola | food | student | mary-hall | yes | yes | 6" celebration cake 18,000, cupcakes (6) 7,500, banana bread 4,500, red velvet slice 2,500, cookies (12) 5,000 |
| 7 | Glow by Tolu (`glow-by-tolu`) | tolu.adebayo | beauty | student | deborah-hall | no | no | shea body butter 5,500, vitamin C serum 9,000, black soap 3,000, lip gloss set 4,500, sunscreen 7,500 |
| 8 | Lens & Light Studios (`lens-and-light`) | femi.ogunleye | photography | business | student-centre | no | yes | portrait session 25,000, convocation shoot 45,000, event coverage (2h) 60,000, passport photos 2,000, photo editing 5,000 |
| 9 | Page Turner Books (`page-turner-books`) | grace.ekpo | books | student | library | no | no | used Engineering Maths (Stroud) 9,000, GST past questions 2,500, Campbell Biology (used) 12,000, novels 3,500, Financial Accounting text 7,000 |
| 10 | Kicks Republic (`kicks-republic`) | emeka.udo | shoes | student | john-hall | no | yes | Air Force 1 70,000, Adidas Samba 78,000, Crocs Classic 35,000, slides 9,000, New Balance 550 82,000 |
| 11 | Scent Lab (`scent-lab`) | kunle.adeyemi | accessories | student | paul-hall | yes | yes | oud oil 10ml 8,000, designer-inspired EDP 18,000, body mist 6,500, perfume decants 5ml 4,000, car/room diffuser 7,000 |
| 12 | Braids by Ada (`braids-by-ada`) | adaeze.nnamdi | hair-beauty | student | lydia-hall | no | yes | knotless braids (mid-back) 25,000, cornrows 8,000, twists 18,000, wig install 10,000, wash & style 5,000 |
| 13 | SpinClean Laundry (`spinclean-laundry`) | tunde.bakare | laundry | business | hostel-area-male | yes | yes | wash & fold (per bag) 3,000, ironing (10 pieces) 2,500, duvet wash 4,000, express same-day 5,000, suits/blazers 2,000 |
| 14 | PrintPoint (`printpoint`) | bola.ige | school-essentials | business | cst | no | yes | B&W printing (per page) 50, colour printing 200, spiral binding 1,000, A4 hard notebooks 1,500, scientific calculator (Casio fx-991ES) 18,000 |
| 15 | Chop Express (`chop-express`) | ngozi.eze | food | student | joseph-hall | yes | no | small chops pack 3,000, puff-puff (20) 1,500, meat pie 800, zobo 1L 1,500, peppered gizzard 2,500 |
| 16 | Gadget Doctor (`gadget-doctor`) | yusuf.bello | services | student | student-centre | no | yes | phone screen replacement from 25,000, battery replacement 12,000, laptop cleaning 8,000, software/OS install 5,000, charging port repair 7,000 |
| 17 | Ankara Avenue (`ankara-avenue`) | funmi.alade | fashion | student | dorcas-hall | no | yes | Ankara two-piece 22,000, custom tailoring (sewing) 15,000, Ankara tote 6,000, bucket hat 4,500, headwrap 3,000 |
| 18 | MathPro Tutors (`mathpro-tutors`) | samuel.okon | tutoring | student | cmss | no | no | MAT 101 tutorial (per session) 3,000, exam prep bundle (4 sessions) 10,000, physics tutorial 3,000, statistics help 3,500, past-question walkthrough 2,000 |
| 19 | Trinkets & Co (`trinkets-and-co`) | ope.salami | accessories | student | esther-hall | yes | no | beaded bracelet 2,500, gold-tone necklace 6,000, mini handbag 14,000, scrunchie set 2,000, earrings set 3,500 |
| 20 | Smoothie Spot (`smoothie-spot`) | kemi.fashola | food | student | cafeteria-1 | yes | yes | strawberry-banana smoothie 2,500, yoghurt parfait 3,000, fruit salad 2,000, tiger-nut drink 1,500, green detox 2,800 |

Use 5 listings per business. Where the table gives fewer than 5 examples, add realistic ones in the same style.

Demo buyers (12): tobi.adeyemi, amara.okafor, david.ojo, blessing.uche, victor.nwachukwu, esther.olatunji, michael.adewale, precious.okeke, joshua.ayodele, favour.eze, john.ibe, deborah.akpan. Full names are title-cased from the local-part. Emails are `<local>@demo.cu-marketplace.local`.

Hours presets (Lagos time): `food` Mon–Sat 08:00–20:00, Sun 14:00–19:00. `service` Mon–Fri 10:00–18:00, Sat 11:00–16:00. `student` Mon–Fri 16:00–21:00, Sat 10:00–18:00 (students sell after lectures). Assign each business a fitting preset.

**Generator (`build.mjs`) rules:**
- Deterministic UUIDs: `uuidFrom(key)` = first 16 bytes of `sha1("cu-marketplace:" + key)`, formatted as a v5-style UUID. Seeded PRNG: mulberry32 seeded with 20261001.
- Output order:
  1. `begin;`
  2. Insert `categories` and `locations` with `on conflict (slug) do nothing`.
  3. Insert demo `auth.users`: `instance_id` `00000000-0000-0000-0000-000000000000`, `aud`/`role` `authenticated`, `encrypted_password` `''` (can't sign in), `email_confirmed_at now()`, `raw_user_meta_data {"full_name": ...}`, `raw_app_meta_data {"provider":"email","providers":["email"]}`, and `confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new` all `''`, `created_at`/`updated_at now()`.
  4. `update profiles set is_demo = true, cu_verified = true where email like '%@demo.cu-marketplace.local';`
  5. Insert businesses, products, images and variants (`is_demo = true`). Spread `created_at` over the last 75 days so "Recently listed" and "New on campus" differ.
  6. Generate about 160 orders, mostly `completed` (about 80%) with the rest pending/confirmed/ready/cancelled. Each has 1–2 items from one business, a demo buyer who isn't the owner, matching `order_items` with snapshots, and an `order_events` chain. `created_at` falls within the last 60 days.
  7. Create reviews for about 70% of completed order items. Ratings follow a realistic distribution (5: 55%, 4: 30%, 3: 10%, 2: 4%, 1: 1%). About 60% have a body chosen from a pool of 40 short, specific, believable review texts per type (product, food, service). Sub-ratings are included 50% of the time.
  8. Create about 40 demo conversations with 2–6 messages each, with realistic buyer questions and seller replies. Reply delays range from 5 to 240 minutes, so `business_response_stats` has real input.
  9. Set `products.view_count` to `order_count * (8..25)`. Reviews feed the rating aggregates via trigger. `order_count` is computed from the generated orders in a single `update`.
  10. `commit;`
- Because the seed runs as `postgres`, `auth.uid()` is null, so `is_trusted()` is true and the triggers allow demo values.

`remove_demo.sql`:
```sql
begin;
delete from public.reviews where is_demo;
delete from public.messages where is_demo;
delete from public.conversations where is_demo;
delete from public.orders where is_demo;
delete from public.products where is_demo;
delete from public.businesses where is_demo;
delete from auth.users where email like '%@demo.cu-marketplace.local';
commit;
```

- [ ] **Step 1: Write `data.mjs`** with all the reference data, all 20 businesses with 5 listings each, buyers, review text pools, and message scripts. Images use `https://images.unsplash.com/photo-<id>?w=900&q=70&auto=format&fit=crop`.
- [ ] **Step 2: Write `scripts/check-images.mjs`.** It HEAD-requests every image URL in `data.mjs` and prints any that aren't 200. Run it, and replace or remove failures until it prints `all images OK`.
- [ ] **Step 3: Write `build.mjs`** and run `npm run seed:build`. Then check: `grep -c "insert into public.products" supabase/seed.sql` reports 100 product rows (one multi-row insert per business is fine, so count rows, not statements). Also check the file contains `nike-dunk-low-panda` and `daniels-closet`.
- [ ] **Step 4 (USER):** In the Supabase SQL editor, run `0001_schema.sql`, `0002_functions.sql`, `0003_policies.sql` and `seed.sql`, then `tests/rls.sql`. Expected: the final row reads `ALL RLS CHECKS PASSED`. Any `FAIL:` gets fixed in the migration and the change is re-run as a new `0004_fix_*.sql`. Applied files are never edited.
- [ ] **Step 5 (USER):** Auth settings: under Authentication → URL Configuration, set Site URL `http://localhost:3000` and add redirect `http://localhost:3000/auth/callback`. Keep "Confirm email" ON.
- [ ] **Step 6: Commit** `feat(db): realistic demo seed and removal script`.

---

### Task 7: Supabase clients, session refresh, auth helpers

**Files:** Create `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/session.ts`, `proxy.ts` (or `middleware.ts`), `lib/auth.ts`, `lib/images.ts`

**Interfaces (produced):**
```ts
// lib/supabase/server.ts
createClient(): Promise<SupabaseClient>         // RSC/actions; cookie-backed
// lib/supabase/client.ts
createBrowserClient(): SupabaseClient           // singleton in browser
// lib/auth.ts
type Viewer = { id: string; email: string; fullName: string; role: "student"|"staff"|"admin"; cuVerified: boolean;
                businessId: string | null; businessSlug: string | null }
getViewer(): Promise<Viewer | null>              // cached per request with React cache()
requireViewer(next?: string): Promise<Viewer>    // redirects to /auth/sign-in?next=...
requireSeller(): Promise<Viewer & { businessId: string; businessSlug: string }>  // redirects to /sell/onboarding
requireAdmin(): Promise<Viewer>                  // notFound() if not admin
// lib/images.ts
imageUrl(path: string | null): string | null     // http(s) passthrough, else public storage URL for product-images
```

- [ ] **Step 1: server.ts**
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* RSC: proxy refreshes */ } },
    },
  });
}
```
- [ ] **Step 2: client.ts**
```ts
"use client";
import { createBrowserClient as create } from "@supabase/ssr";
let client: ReturnType<typeof create> | undefined;
export const createBrowserClient = () =>
  (client ??= create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
```
- [ ] **Step 3: session.ts + proxy.**
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth = ["/orders", "/saved", "/messages", "/notifications", "/account", "/sell", "/admin"].some((p) => path === p || path.startsWith(p + "/"));
  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in"; url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
```
`proxy.ts`:
```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
export async function proxy(request: NextRequest) { return updateSession(request); }
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"] };
```
(On Next < 16, name the file `middleware.ts` and the export `middleware`.)
- [ ] **Step 4: lib/auth.ts.** Implement with `cache()` from React. `getViewer` calls `supabase.auth.getUser()`, then `profiles.select("full_name, role, cu_verified, email").eq("id", user.id).single()` and `businesses.select("id, slug").eq("owner_id", user.id).maybeSingle()`. `requireViewer` uses `redirect()` from `next/navigation`. `requireAdmin` uses `notFound()`.
- [ ] **Step 5: lib/images.ts**
```ts
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
```
- [ ] **Step 6: Verify** with `npm run typecheck`. Add a temporary `app/debug/page.tsx` that prints `(await createClient()).from("categories").select("name")` and confirm 16 names render. **Delete the debug page afterwards.**
- [ ] **Step 7: Commit** `feat: supabase clients, session refresh and viewer helpers`.

---

### Task 8: UI primitives (design system)

**Files:** Create `components/ui/{Button,Input,Textarea,Select,Checkbox,Field,Badge,Avatar,Tabs,Modal,BottomSheet,Dropdown,Skeleton,EmptyState,Spinner,Toast}.tsx`, `app/(dev)/ui/page.tsx` (a dev-only catalogue that 404s in production)

**Interfaces (produced):**
```ts
Button: props ButtonHTMLAttributes & { variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"|"lg"; loading?: boolean; href?: string }
  primary = bg-accent text-white hover:bg-accent-hover; secondary = bg-surface border-line text-ink hover:bg-subtle;
  ghost = text-ink hover:bg-subtle; danger = text-danger border-line hover:bg-danger-soft. Heights sm 32 / md 40 / lg 44.
  Text 14px, weight 500. Radius control. With href, renders next/link. Loading shows Spinner and sets aria-busy.
Input / Textarea / Select: forwardRef; h-10 (md); border-line; focus border-ink + ring-0; invalid -> border-danger, aria-invalid
Field: { label: string; hint?: string; error?: string; htmlFor: string; children } — label 13px/500, hint muted 12px, error danger 12px role="alert"
Checkbox: { label: ReactNode } & input props — accent-colored check (accent-[--color-accent])
Badge: { tone?: "neutral"|"accent"|"success"|"warning"|"danger"; children } — 12px, h-5 px-1.5, rounded-[4px], soft background
Avatar: { name: string; src?: string|null; size?: 24|32|40|56 } — initials on bg-subtle when no src
Tabs: { tabs: { id: string; label: string; count?: number; href?: string }[]; active: string } — underline style, accent underline for active, horizontally scrollable on mobile
Modal: { open; onClose; title; children; footer? } — centered on ≥sm, uses <dialog> semantics, Esc closes, focus trap via autofocus first field
BottomSheet: { open; onClose; title; children; footer? } — full-width bottom panel on <sm (max-h 85vh, drag handle bar decorative), renders as Modal on ≥sm
Dropdown: { trigger: ReactNode; items: { label; href?; onSelect?; danger? }[]; align?: "start"|"end" }
Skeleton: { className } — bg-subtle animate-pulse (opacity pulse only)
EmptyState: { title: string; body: string; action?: { label: string; href: string }; icon?: LucideIcon } — left-aligned on mobile, centered on desktop, 1px dashed border-line card, icon 20px muted
Spinner: 14px border spinner (only allowed rotation in app)
Toast: ToastProvider + useToast(): { show(message: string, opts?: { tone?: "neutral"|"success"|"danger"; action?: { label; href } }) }
  bottom-center on mobile above nav (bottom-20), bottom-right on desktop; 3.5s; bg-ink text-white 14px; fade only
```

- [ ] **Step 1:** Implement each component in its own file. Use `cn()`, no external UI libraries, and lucide icons at 16–18px with stroke 1.75.
- [ ] **Step 2:** Build the `/ui` catalogue page (rendered only when `process.env.NODE_ENV !== "production"`, otherwise `notFound()`) showing every variant.
- [ ] **Step 3: Verify in the browser** at 375px and 1280px. Buttons align on a 4px grid, focus rings are visible, the BottomSheet sits at the bottom on mobile and is a modal on desktop, and Esc closes both.
- [ ] **Step 4: Commit** `feat(ui): design system primitives`.

---

### Task 9: App shell — header, mobile nav, cart store, toasts

**Files:** Create `components/layout/{SiteHeader,MobileNav,SiteFooter,AccountMenu,CartButton,NotificationBell,Logo}.tsx`, `lib/cart/store.tsx`, `app/(shop)/layout.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/(shop)/loading.tsx`

**Interfaces:**
- Consumes: `getViewer()`, `cartCount`, `addLine`, `setQuantity`, `removeLine` (Task 2), `Toast` (Task 8)
- Produces: `CartProvider` and `useCart(): { lines: CartLine[]; count: number; add(line: CartLine): void; setQty(key: string, q: number): void; remove(key: string): void; clearBusinesses(ids: string[]): void; ready: boolean }`. It persists to localStorage key `cu-cart:v1` (wrapped in try/catch) and syncs across tabs via the `storage` event.

Layout spec:
- **Desktop header** (h-16, bg-surface, border-b border-line, sticky):
  - Left: `Logo` (a burgundy 20px square monogram "cu" in white, then "Marketplace" in 15px semibold ink).
  - Centre: `SearchBar` (Task 13; render a plain `<form action="/search">` input until then), max-w 520.
  - Right: nav links Marketplace (`/browse`), Businesses, Orders, Saved; a `Sell` secondary button; a messages icon with an unread dot; `NotificationBell` (count badge); `CartButton` (count); `AccountMenu` (avatar dropdown: Account, Seller dashboard / Start selling, Admin when admin, Sign out). Signed out, show "Sign in" ghost and "Create account" primary instead of Orders/Saved/account.
  - Active link: ink text with a 2px accent underline. Inactive: muted.
- **Mobile header** (h-14): logo, a search icon button linking to `/search`, cart.
- **MobileNav** (fixed bottom, h-16, safe-area padding, border-t, bg-surface; hidden ≥md): Home, Browse, Orders, Saved, Profile (`/account`). Icons 20px, labels 11px. Active item is accent, others muted.
- `(shop)/layout.tsx` wraps children in `max-w-[1200px] mx-auto px-4 md:px-6`, with `pb-24 md:pb-12` so content clears the nav.
- **Footer** (desktop only): one line of muted 12px text: "CU Marketplace is a student-run marketplace for the Covenant University community. Not an official university service." Plus links: Safety tips (`/safety`, a static page in this task with practical meet-up and payment advice), Report a problem (`/account#reports`).
- `NotificationBell` counts unread notifications server-side, and Task 24 adds realtime increments.

- [ ] **Step 1:** Implement the store and shell.
- [ ] **Step 2:** `not-found.tsx` uses EmptyState "Page not found" / "The link may be broken or the listing was removed." with an action to `/browse`. `error.tsx` is a client component showing "Something went wrong" with a retry button.
- [ ] **Step 3: Verify in the browser.** The header shows the signed-out state. Resize to 375 and the bottom nav appears without overlapping content. Adding to the cart through the console updates the count in both tabs.
- [ ] **Step 4: Commit** `feat: app shell with responsive navigation and cart store`.

---

### Task 10: Auth flows

**Files:** Create `app/auth/layout.tsx`, `app/auth/sign-up/page.tsx`, `app/auth/sign-in/page.tsx`, `app/auth/verify/page.tsx`, `app/auth/reset/page.tsx`, `app/auth/update-password/page.tsx`, `app/auth/callback/route.ts`, `app/auth/actions.ts`, `components/auth/AuthForm.tsx`

**Interfaces:**
- Produces server actions (all return `ActionResult = { ok: true } | { ok: false; error?: string; fieldErrors?: Record<string, string> }`, defined in `lib/actions/result.ts`):
  - `signUp(prev, formData)`: fields full_name, email, affiliation, password, phone?
  - `signIn(prev, formData)`: email, password, next
  - `requestReset(prev, formData)`: email
  - `updatePassword(prev, formData)`: password
  - `signOut()`

Rules:
- Zod schema: full_name 2–60, email must pass `isCuEmail` ("Use your Covenant University email (e.g. name@stu.cu.edu.ng)"), password ≥ 8 with at least one letter and one digit, phone optional and matching `^(\+234|0)[789][01]\d{8}$`, affiliation `student|staff`.
- `signUp` calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL + "/auth/callback?next=/", data: { full_name, affiliation, phone } } })`, then redirects to `/auth/verify?email=…`. It must never say whether an email already exists. Map Supabase's "User already registered" to the same verify page.
- `signIn`: on "Email not confirmed", show "Confirm your email first. We sent a link to …" with a resend button (`supabase.auth.resend({ type: "signup", email })`). Otherwise "Email or password is incorrect." Validate `next` as a relative path starting with `/` and not `//`.
- `callback/route.ts`: `exchangeCodeForSession(code)`, then redirect to `next` (validated). On error, redirect to `/auth/sign-in?error=link`.
- Layout: a centered 400px column on the canvas with the logo at the top. No illustrations. The sign-up page has a small line under the form: "Only Covenant University email addresses can join. Your phone number is never shown publicly."
- Forms use `useActionState`, disable submit while pending, and show inline field errors.

- [ ] **Step 1:** Implement the actions and pages.
- [ ] **Step 2: Verify manually.** Sign up with `x@gmail.com` and get the inline domain error. Sign up with a real CU address (the user does this) and land on the verify page. Clicking the email link signs you in and lands on home with the avatar showing. Sign out works. `/orders` signed out redirects to sign-in with `next`, and after signing in you return to `/orders`.
- [ ] **Step 3: Commit** `feat(auth): CU email sign-up, verification, sign-in, reset`.

---

### Task 11: Catalog queries + ProductCard / BusinessCard

**Files:** Create `lib/queries/reference.ts`, `lib/queries/catalog.ts`, `lib/queries/businesses.ts`, `components/market/{Price,Rating,VerifiedBadge,OpenStatus,LocationLabel,SaveButton,ProductCard,ProductGrid,BusinessCard,CategoryRail}.tsx`, `components/market/skeletons.tsx`

**Interfaces (produced):**
```ts
// reference.ts (cached with unstable_cache / "use cache" if available, revalidate 1h)
getCategories(): Promise<Category[]>
getLocations(): Promise<Location[]>
// catalog.ts
const PRODUCT_CARD_SELECT = "id, slug, title, kind, price_kobo, compare_at_kobo, stock, condition, rating_avg, rating_count, created_at, images:product_images(path, position), business:businesses!inner(id, slug, name, verified, status, seller_type), location:locations!products_pickup_location_id_fkey(slug, name)"
toCard(row): ProductCardData             // picks lowest-position image via imageUrl
type BrowseParams = { q?: string; category?: string; kind?: "product"|"service"; min?: number; max?: number; location?: string;
  rating?: number; inStock?: boolean; seller?: "student"|"business"|"verified"; condition?: Condition; fulfilment?: "pickup"|"delivery";
  sort?: "recommended"|"newest"|"price_asc"|"price_desc"|"rating"; page?: number }
browseProducts(p: BrowseParams): Promise<{ items: ProductCardData[]; total: number; pageSize: 24 }>
getTrending(limit = 12), getRecentlyListed(limit = 12), getPopularServices(limit = 8): Promise<ProductCardData[]>
getProductsByIds(ids: string[]): Promise<ProductCardData[]>       // preserves input order (recently viewed)
// businesses.ts
const BUSINESS_SELECT = "id, slug, name, tagline, verified, seller_type, rating_avg, rating_count, hours, logo_url, offers_delivery, created_at, category:categories(slug, name), location:locations(slug, name, map_x, map_y), products(count)"
listBusinesses(opts: { category?: string; location?: string; q?: string; sort?: "popular"|"new"|"rating"|"near"; near?: string; limit?: number }): Promise<BusinessSummary[]>
getBusinessesNear(locationSlug: string | null, limit = 8): Promise<BusinessSummary[]>   // distance on map_x/map_y; null -> popular
```
`browseProducts` always starts from `supabase.rpc("search_products", { p_q: normalizeQuery(q) }).select(PRODUCT_CARD_SELECT, { count: "exact" })`, then chains filters:
- `category`: look up the id via `getCategories()`, then `.eq("category_id", id)`
- `kind`: `.eq("kind", …)`
- `min`/`max`: given in naira, so ×100 for `.gte("price_kobo", …)`/`.lte(…)`
- `location`: `.eq("pickup_location_id", id)`
- `rating`: `.gte("rating_avg", r)`
- `inStock`: `.or("stock.is.null,stock.gt.0")`
- `seller=verified`: `.eq("business.verified", true)`. `student`/`business`: `.eq("business.seller_type", …)`
- `condition`: `.eq("condition", …)`
- `fulfilment`: `.eq("allows_delivery", true)` or `.eq("allows_pickup", true)`
- `sort`: newest `.order("created_at", { ascending: false })`, price asc/desc, rating `.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false })`. With recommended, add no order (the function orders by relevance/score).
- `.range((page-1)*24, page*24-1)`. Always `.eq("status", "active")`.

**ProductCard** (the most important component; build it carefully):
- Root: a `next/link` block, with no border on the image itself. Image box `aspect-[4/5] rounded-card bg-subtle overflow-hidden`, using `next/image` with `fill`, `sizes="(min-width:1024px) 220px, (min-width:640px) 30vw, 46vw"`, lazy loading, and a 150ms opacity fade-in on load. With no image, show a neutral placeholder: the category name in muted 12px centred on bg-subtle.
- Top-right of the image: `SaveButton` (32px circle, bg-surface/90, heart icon; filled accent when saved). Clicking it doesn't trigger navigation.
- Badges sit on the image's bottom-left, at most one: "Sold out" (neutral, stock 0), "Only N left" (warning, stock ≤ 3), "Service" (neutral, kind=service), "Used" / "Like new" (neutral). Priority runs in that order.
- Text block (`pt-2 space-y-0.5`):
  - title 14px/500, ink, `line-clamp-2`
  - `Price`: 15px semibold tabular. When `compare_at_kobo` exists, also show it struck through in 12px muted.
  - seller line: 12px muted, `{business.name}`, plus `VerifiedBadge` (a 12px check-seal icon in accent with an sr-only "Covenant Verified"; no text on cards)
  - meta line: 12px muted, `★ 4.8 (23) · Daniel Hall`. Rating shows only when `rating_count > 0`; otherwise "New".
- Hover (desktop): the image gets a subtle `brightness-[.97]`. No lift or shadow.
- `ProductGrid`: `grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. A `variant="rail"` renders a horizontal scroll row (`snap-x`, cards w-[44vw] sm:w-[200px]).

**BusinessCard:** a row card (border-line, rounded-card, p-3, bg-surface) containing:
- a 48px logo (or initials Avatar)
- name (15px/500) + VerifiedBadge
- category · location (13px muted)
- `★ 4.8 (126) · 12 listings` (12px muted)
- OpenStatus as a dot plus label: green dot and "Open · closes 8:00 PM", or a muted dot and "Closed · opens …"

The whole card links to `/b/[slug]`. Variant `compact` is used in rails at w-[260px].

- [ ] **Step 1:** Implement queries and components.
- [ ] **Step 2:** Render the dev catalogue (`/ui`) with live trending products and businesses. Verify against seed data: prices format correctly, ratings show, Daniel's Closet shows the verified mark, and Glow by Tolu doesn't.
- [ ] **Step 3: Commit** `feat: catalog queries, product and business cards`.

---

### Task 12: Home page

**Files:** Create `app/(shop)/page.tsx`, `components/market/LocationPicker.tsx` (client), `lib/location-pref.ts`

**Interfaces:** `getLocationPref(): Promise<string | null>` reads the `cu_loc` cookie. `setLocationPref(slug)` is a server action that sets a 1-year cookie and revalidates `/`.

Layout, top to bottom (mobile-first):
1. **Intro block** (`pt-6 md:pt-10 pb-6`), not a hero:
   - h1 "Find it on campus." (24px md:28px semibold, tracking-tight)
   - p muted 15px: "Discover products, services and student businesses around Covenant University."
   - a large `SearchBar` (h-12, placeholder "Search products, services or businesses…"). On desktop the header search stays too; that's fine because the home one is primary.
2. **Popular categories:** `CategoryRail`, a horizontally scrolling row of 36px pill links (border-line, 13px; icon optional, 14px lucide matched per category, no emoji). On ≥md it wraps.
3. **Trending on campus:** section header row with an h2 (17px semibold) and a "See all" link (`/browse?sort=recommended`). `ProductGrid` rail of 12 from `getTrending`.
4. **Businesses near you:** header with an inline `LocationPicker` ("near **Daniel Hall** ▾", opening a BottomSheet/Dropdown of locations grouped by zone). With no preference, the title is "Popular businesses" and the picker reads "Set your hall". Shows a grid of 4–8 `BusinessCard`s (1 col mobile, 2 sm, 4 lg).
5. **Recently listed:** a 12-item rail.
6. **Popular services:** a grid of 8 service cards.
7. **New on campus:** businesses created in the last 30 days (compact cards). Hidden when there are none.

Every section is in its own `<Suspense>` with skeleton fallbacks matching the final shape. The page uses `export const revalidate = 60`. The location section is dynamic via the cookie.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** at 375px and 1280px. No horizontal page scroll (rails scroll internally). Setting the location reorders businesses, with closer halls first. Check the first-load network: images are lazy below the fold and the trending rail images use `priority` only for the first 2.
- [ ] **Step 3: Commit** `feat: home page with local discovery sections`.

---

### Task 13: Search (suggest API, search bar, results page)

**Files:** Create `app/api/search/suggest/route.ts`, `components/market/SearchBar.tsx` (client), `app/(shop)/search/page.tsx`, `lib/queries/search.ts`, `lib/recent-searches.ts` (client localStorage helpers)

**Interfaces:**
```ts
// GET /api/search/suggest?q=  -> 200 JSON
type Suggestions = { products: { slug: string; title: string; price_kobo: number; image: string | null }[];
                     businesses: { slug: string; name: string; category: string | null }[];
                     categories: { slug: string; name: string }[] }
// lib/queries/search.ts
suggest(q: string): Promise<Suggestions>        // 5 products, 4 businesses, 3 categories
searchAll(q: string): Promise<{ products: ProductCardData[]; services: ProductCardData[]; businesses: BusinessSummary[] }>
// lib/recent-searches.ts
getRecent(): string[]; pushRecent(q: string): void; clearRecent(): void   // key "cu-recent-searches", max 6, dedup case-insensitive
POPULAR_SEARCHES = ["perfume", "thrift", "food", "phone accessories", "sneakers", "cakes", "laptop charger", "braids"]
```
Behaviour:
- `SearchBar`: a combobox (`role="combobox"`, `aria-expanded`, listbox options, Up/Down/Enter/Esc).
  - On focus with an empty input, show "Recent" (with a clear button) and "Popular" chips.
  - On typing, debounce 200ms, abort the in-flight fetch with AbortController, and show grouped results (Products with thumbnail + price, Businesses with category, Categories).
  - The last item is "Search for “q”". Enter submits to `/search?q=`.
  - The suggest route sets `Cache-Control: public, s-maxage=30, stale-while-revalidate=120`.
- Mobile: `/search` is a dedicated page. Its input autofocuses only when there's no `q`.
- `/search?q=&tab=all|products|services|businesses`:
  - Tabs show counts. "All" shows up to 8 products, 4 businesses and 4 services, each with a "See all" link.
  - Products/Services tabs reuse the browse filter UI (Task 14), pre-filtered by `q` and kind.
  - Businesses tab shows a list of BusinessCards.
- With no results, use EmptyState "Nothing matched your search." / "Try a different keyword or remove a filter.", plus popular-search chips.
- An empty `q` shows recent and popular searches plus categories.

- [ ] **Step 1: Test.** Add `tests/recent-searches.test.ts` with a minimal in-memory `localStorage` stub: push dedups case-insensitively, caps at 6, and newest comes first.
- [ ] **Step 2:** Implement.
- [ ] **Step 3: Verify.** Type "snea" and suggestions show sneakers within ~300ms. Type `it's 50% & :` and nothing errors. "black shirt" returns products. "laundry" surfaces SpinClean under Businesses. Keyboard navigation works.
- [ ] **Step 4: Commit** `feat: instant search with suggestions and grouped results`.

---

### Task 14: Browse / marketplace page with filters

**Files:** Create `app/(shop)/browse/page.tsx`, `components/market/FilterPanel.tsx` (client), `components/market/SortSelect.tsx`, `components/market/ActiveFilters.tsx`, `lib/browse-params.ts` (+ `tests/browse-params.test.ts`)

**Interfaces:**
```ts
// lib/browse-params.ts
parseBrowseParams(sp: Record<string, string | string[] | undefined>): BrowseParams   // tolerant: invalid values dropped
toSearchParams(p: BrowseParams): URLSearchParams                                    // omits defaults
```
- [ ] **Step 1: Failing tests** for `parseBrowseParams`:
  - `min=abc` is dropped
  - `rating=9` is dropped (valid 1–5)
  - `sort=bogus` becomes recommended
  - `page=0` becomes 1
  - repeated keys take the first value
  - `inStock=1` is true
  - round-trip `toSearchParams(parseBrowseParams(x))` is stable for a valid x
- [ ] **Step 2:** Implement and pass.
- [ ] **Step 3: Page.**
  - Desktop: a 240px left `FilterPanel` (sticky top-20), and a results column on the right.
  - Results header: "{total} results" (muted 13px), `SortSelect` on the right, `ActiveFilters` chips (each removable, plus "Clear all").
  - Filter sections, each a small 13px/600 heading:
    - Category: radio list, showing 8 then "Show all"
    - Price: min/max naira inputs plus quick ranges (Under ₦5,000 · ₦5k–20k · ₦20k–50k · ₦50k+)
    - Location: select grouped by zone
    - Rating: "4★ & up", "3★ & up"
    - Availability: "In stock only"
    - Seller: Any / Verified sellers / Students / Campus businesses
    - Condition: New / Like new / Used
    - Fulfilment: Pickup / Delivery available
  - Changes update the URL with `router.replace` inside `useTransition` (no scroll jump). Results dim to `opacity-60` while pending; there's no spinner.
  - Mobile: a sticky bar under the header with a "Filters (n)" button opening a `BottomSheet` with the same panel plus a footer "Show {n} results" button (applies on close), and `SortSelect` next to it.
  - Pagination: a "Load more" link to `?page=n+1` that renders pages 1..n (server); show "Showing 48 of 112".
- [ ] **Step 4: Verify.** Combine category=food + delivery + rating 4: the result count drops and the chips show. Remove a chip and it updates. The mobile sheet works at 375px. Filtering to an empty set shows the EmptyState with a "Clear filters" action.
- [ ] **Step 5: Commit** `feat: marketplace browse with URL-driven filters`.

---

### Task 15: Product detail page

**Files:** Create `app/(shop)/p/[slug]/page.tsx`, `lib/queries/product.ts`, `components/market/{ProductGallery,VariantPicker,QuantityStepper,AddToCart,ProductFacts,SellerPanel,ReviewSummary,ReviewCard,RecentlyViewed}.tsx`, `lib/recently-viewed.ts`

**Interfaces:**
```ts
getProduct(slug: string): Promise<ProductDetail | null>
type ProductDetail = ProductCardData & { description: string; category: Category | null; images: string[];
  variants: { id: string; name: string; value: string; stock: number | null; price_delta_kobo: number }[];
  allows_pickup: boolean; allows_delivery: boolean; delivery_note: string | null; created_at: string; status: ProductStatus;
  business: BusinessSummary & { owner_id: string; delivery_note: string | null } }
getProductReviews(productId: string, limit = 6): Promise<ReviewView[]>
type ReviewView = { id: string; rating: number; body: string | null; created_at: string; author: string /* shortName */;
  quality: number|null; communication: number|null; accuracy: number|null; fulfilment_rating: number|null; productTitle?: string }
getSimilar(product: ProductDetail, limit = 10): Promise<ProductCardData[]>   // same category, exclude self, score desc
```
Layout:
- Breadcrumb (12px muted): Marketplace / Category.
- **Desktop** (`grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10`):
  - Left: `ProductGallery`. Main image `aspect-[4/5]` rounded-card, thumbnails row below (64px, the active one gets a 1.5px ink ring). Keyboard arrows switch images.
  - Right column, in order:
    1. Title (22px semibold), then the price (24px semibold tabular, compare-at struck)
    2. Availability line: green "In stock" / warning "Only 2 left" / danger "Sold out" / "Made to order" (stock null)
    3. Seller line: logo + name + VerifiedBadge + `★ 4.8 (126)` → links to the storefront
    4. `VariantPicker`: pill buttons per variant name. Out-of-stock values are struck and disabled. A price delta shows as "+₦1,000".
    5. `QuantityStepper` (1..min(stock,20))
    6. Actions: primary "Add to cart" (lg, full width on mobile), secondary "Message seller", icon "Save". If the viewer owns the business, show "Edit listing" (→ `/sell/products/[id]`) instead of cart/message.
    7. `ProductFacts`, a 2-col definition list in a bordered card: Condition · Availability · Pickup (location name, or "Not offered") · Delivery ("Available · {delivery_note}" / "Not offered") · Category · Listed (relative date). Below it, a muted line: "Exact pickup details are shared privately after you order."
    8. Description: plain paragraphs, `whitespace-pre-line`, 15px leading-7, max 65ch.
    9. "Report listing" as a text button (opens ReportDialog, Task 25), small and muted, at the end.
- **Mobile:** a gallery that swipes (scroll-snap) with dots, then the info. A sticky bottom action bar above MobileNav: price on the left, "Add to cart" on the right. The MobileNav is hidden on this route; the sticky bar replaces it.
- Below the fold:
  - **About the seller:** `SellerPanel` (BusinessCard expanded: OpenStatus, location, response stats when ≥3 conversations: "Usually replies within 30 min · 92% response rate", buttons Visit store / Message)
  - **Reviews** (id `reviews`): `ReviewSummary` (average, count, 5→1 distribution bars in ink on subtle, and sub-rating averages when present). `ReviewCard`s each carry a "✓ Verified purchase" label in success color 12px, the author's shortName and a relative date. "See all reviews" links to `/b/[slug]#reviews`.
  - **Similar items** rail
  - **Recently viewed** rail (client; localStorage ids `cu-recent-products`, max 12, excluding the current item, fetched via a server action `getProductsByIds`)
- Server: call `increment_product_view` with `after()` from `next/server` (non-blocking). `generateMetadata` provides title and OG image.
- **AddToCart:** builds a `CartLine` from the detail plus the selected variant. A required variant left unselected gives an inline "Choose a size". On add: `useCart().add`, and a toast "Added to cart" with a "View cart" action. The cart count updates immediately.
- Products not visible (removed/paused) return `notFound()`, except for the owner, who sees a banner "This listing is paused — only you can see it."

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** on Nike Dunk Low: variants work and a sold-out size is disabled. Add to cart, and the header count goes to 1. Sign in as yourself: Message seller works (Task 23; it's a no-op link until then). Check the mobile sticky bar at 375px. Reviews show a verified purchase label.
- [ ] **Step 3: Commit** `feat: product detail page`.

---

### Task 16: Storefront, business directory, locations & campus map

**Files:** Create `app/(shop)/b/[slug]/page.tsx`, `app/(shop)/businesses/page.tsx`, `app/(shop)/locations/page.tsx`, `app/(shop)/locations/[slug]/page.tsx`, `components/market/{StorefrontHeader,HoursTable,CampusMap,FollowButton}.tsx`, `lib/queries/storefront.ts`

**Interfaces:**
```ts
getStorefront(slug: string): Promise<{ business: BusinessSummary & { description: string|null; delivery_note: string|null; owner_id: string; created_at: string };
  stats: { conversations: number; response_rate: number | null; avg_response_minutes: number | null };
  products: ProductCardData[]; reviews: ReviewView[]; ratingBreakdown: Record<1|2|3|4|5, number>; productCount: number } | null>
```
**Storefront** `/b/[slug]`:
- `StorefrontHeader`, no cover banner:
  - 64px logo
  - name (22px semibold), VerifiedBadge with the text "Covenant Verified" (this is the one place the full text shows besides profiles)
  - line: `★ 4.8 (126 reviews) · Fashion · Daniel Hall`
  - OpenStatus
  - buttons Message (primary sm) and Follow (secondary sm; toggles `saved_businesses`, label Following)
- `Tabs` (anchor-based, all on one page for speed): Products (count) · Reviews (count) · About.
  - Products: a grid with a small category filter row built from the business's own product categories, plus a sort (Newest / Price).
  - Reviews: summary plus a list; the product title shows on each review.
  - About: description; business info `dl` (Seller type: Student seller / Campus business · Category · Pickup location · Delivery: offered + note · On CU Marketplace since: month year); `HoursTable` (Mon–Sun, today bold); response stats when ≥3 conversations, otherwise omitted; "Report this business" text button.

**Directory** `/businesses`:
- h1 "Businesses" (22px) with a subtitle "Student sellers and campus businesses, all in one place."
- Category chips (all categories that have businesses), a sort (Popular / Highest rated / Newest / Near me, which uses the location pref), and an "Open now" toggle.
- Sections when unfiltered: Student favorites (rating ≥4.5 & ≥10 reviews), New on campus (≤30d), Popular businesses (rating_count), All businesses (grid). When filtered, it's a single grid.

**Locations** `/locations`:
- `CampusMap`: an inline SVG (`viewBox="0 0 100 100"`, aspect 4:3 on mobile), drawn as a quiet schematic:
  - zone areas as rounded rects in subtle fill: Male halls (left top), Female halls (right top), Central, Academic
  - paths as 0.6px line-strong strokes
  - one pin per location (5px circle; accent when it has ≥1 business, line-strong when empty) with a text label on ≥md
  - pins are links with an accessible title and business count
  - caption: "Schematic map — not to scale."
- The list below the map is grouped by zone, each with a business count.
- `/locations/[slug]` shows the location name and zone, businesses there (cards), listings with pickup there (grid), and nearby locations.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify.** Daniel's Closet storefront: tabs jump, Follow toggles (signed in) or redirects to sign-in (signed out), the hours table highlights today. The directory "Open now" filter changes results depending on the time. The map renders crisply at 375px and pins link correctly.
- [ ] **Step 3: Commit** `feat: storefronts, business directory and campus locations`.

---

### Task 17: Cart & checkout (split orders)

**Files:** Create `app/(shop)/cart/page.tsx`, `components/cart/{CartView,SellerGroup,CheckoutSummary}.tsx`, `lib/actions/checkout.ts`, `lib/checkout-errors.ts` (+ `tests/checkout-errors.test.ts`)

**Interfaces:**
```ts
// lib/actions/checkout.ts ("use server")
reconcileCart(lines: { productId: string; variantId: string | null; quantity: number }[]):
  Promise<{ productId: string; variantId: string | null; available: boolean; unitPriceKobo: number; maxQuantity: number | null;
            allowsPickup: boolean; allowsDelivery: boolean }[]>
placeOrders(input: { lines: { productId: string; variantId: string | null; quantity: number }[];
                     groups: { businessId: string; fulfilment: Fulfilment; note: string }[] }):
  Promise<{ ok: true; orders: { id: string; number: number; businessId: string }[] } | { ok: false; error: string }>
// lib/checkout-errors.ts
checkoutErrorMessage(code: string): string
```
- [ ] **Step 1: Failing test** for `checkoutErrorMessage`:
  - `OUT_OF_STOCK` → "Some items no longer have enough stock. We've updated your cart."
  - `NOT_VERIFIED` → "Confirm your Covenant University email before ordering."
  - `OWN_PRODUCT` → "You can't order from your own store."
  - `UNAVAILABLE` → "Some items are no longer available."
  - `DELIVERY_UNAVAILABLE` → "Delivery isn't available for one of these sellers."
  - unknown → "We couldn't place your order. Please try again."
- [ ] **Step 2:** Implement and pass.
- [ ] **Step 3: Cart page.**
  - On mount, call `reconcileCart` and update lines: mark unavailable ones, show a "Price updated" warning badge next to changed prices, and clamp quantities.
  - Layout: on the left, one `SellerGroup` per seller (header: seller name + verified + location; lines with 64px thumb, title, variant, price, stepper, remove; a fulfilment radio Pickup/Delivery limited to what every line allows; an optional note textarea, 200 chars, "Anything the seller should know?"). On the right (bottom on mobile), `CheckoutSummary`.
  - When there are 2+ sellers, show an info strip above the groups (border-line, bg-surface, 13px): "Your cart has items from 3 sellers, so it will be placed as 3 separate orders. Each seller confirms and prepares their own order."
  - `CheckoutSummary` per-seller subtotal lines, a total, a line "Payment: pay the seller on pickup or delivery. Never pay before an order is confirmed.", and a primary "Place 3 orders" (or "Place order").
  - Signed out: the button reads "Sign in to order" and links to sign-in with `next=/cart`.
- [ ] **Step 4: placeOrders action.**
  - Zod validate (≤50 lines, qty 1..20, uuid ids).
  - Call `supabase.rpc("place_orders", { p_items, p_groups })`. On success, remove those businesses' lines from the cart (client) and `redirect('/orders?placed=' + numbers.join(','))`.
  - On error, map the message with `checkoutErrorMessage`. For `OUT_OF_STOCK`/`UNAVAILABLE`, re-run reconcile.
- [ ] **Step 5:** With an empty cart, show EmptyState "Your cart is empty." / "Browse the marketplace and add something you like." with an action to Browse.
- [ ] **Step 6: Verify.** Add items from 2 sellers. The split explanation shows and the button says "Place 2 orders". Place them and land on Orders with a confirmation strip: "2 orders placed: #1162 Daniel's Closet, #1163 Campus Bites. Sellers have been notified." Change a price in Supabase while the item is in the cart, reload, and see the "Price updated" badge.
- [ ] **Step 7: Commit** `feat: cart with per-seller order splitting and checkout`.

---

### Task 18: Buyer orders — list, detail, timeline

**Files:** Create `app/(shop)/orders/page.tsx`, `app/(shop)/orders/[id]/page.tsx`, `lib/queries/orders.ts`, `lib/actions/orders.ts`, `components/market/{OrderTimeline,OrderStatusBadge,OrderRow}.tsx`

**Interfaces:**
```ts
getMyOrders(filter: "active" | "completed" | "cancelled" | "all"): Promise<OrderSummary[]>
type OrderSummary = { id: string; number: number; status: OrderStatus; fulfilment: Fulfilment; subtotal_kobo: number; created_at: string;
  business: { slug: string; name: string; verified: boolean }; items: { title_snapshot: string; quantity: number; image_snapshot: string | null }[];
  reviewable: boolean }
getOrder(id: string): Promise<OrderDetail | null>   // includes items, events, pickup_instructions, business location, buyer (for seller view)
updateOrderStatus(orderId: string, status: OrderStatus, instructions?: string): Promise<ActionResult>  // wraps set_order_status; revalidates /orders, /sell/orders
```
- **List:**
  - Tabs: Active · Completed · Cancelled.
  - `OrderRow`: seller name, `#1162`, date, a 2–3 thumbnail stack + "Nike Dunk Low + 1 more", total, `OrderStatusBadge` (pending=neutral, confirmed/preparing=accent-soft, ready/out=success, completed=neutral with check, cancelled=danger-soft). A "Leave a review" link appears when completed and not yet reviewed.
  - A confirmation strip from `?placed=`.
  - Empty: "No orders yet." / "Your purchases will appear here." with a Browse action.
- **Detail:**
  - Header: "Order #1162" with the status badge and placed date.
  - `OrderTimeline`: vertical list from `timelineSteps`. Done steps show a check icon (ink) with the event timestamp; current is a filled accent dot with its label bold; upcoming is a hollow line-strong dot, muted. It shows no animation.
  - A pickup/delivery card. Before instructions exist: "Pickup at {location} · The seller will share exact pickup details here once your order is confirmed." Once they exist, show them in a bordered card titled "Pickup details from {seller}".
  - Items with snapshots and the total. The seller panel has a Message button (starts a conversation with `p_order_id`).
  - Actions: Cancel order (pending only; confirm Modal); "I've received it" (ready/out_for_delivery); "Leave a review" (completed); "Report a problem" (ReportDialog with target business).

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** the full status cycle with Task 21. For now, cancel a pending order: stock is restored and the timeline shows Cancelled.
- [ ] **Step 3: Commit** `feat: buyer orders with status timeline`.

---

### Task 19: Seller onboarding, dashboard overview, store settings

**Files:** Create `app/sell/layout.tsx`, `app/sell/page.tsx`, `app/sell/onboarding/page.tsx`, `app/sell/settings/page.tsx`, `components/sell/{SellerNav,StatTile,BusinessForm,HoursEditor}.tsx`, `lib/actions/business.ts`, `lib/queries/seller.ts`, `lib/validation/business.ts` (+ `tests/business-validation.test.ts`)

**Interfaces:**
```ts
// lib/validation/business.ts
businessSchema: z.ZodType<{ name: string; tagline?: string; description?: string; category_id: string; location_id: string;
  seller_type: "student"|"business"; offers_delivery: boolean; delivery_note?: string; hours: OpeningHours }>
validateHours(h: unknown): OpeningHours   // throws ZodError on "25:00", close <= open, > 3 ranges/day
// lib/actions/business.ts
createBusiness(prev, formData): Promise<ActionResult>   // slug = slugify(name), suffix 4 chars on conflict; redirect /sell
updateBusiness(prev, formData): Promise<ActionResult>
uploadLogo(formData): Promise<ActionResult & { url?: string }>  // business-media/{businessId}/logo-{ts}.webp
// lib/queries/seller.ts
getSellerOverview(businessId: string): Promise<{ todaySalesKobo: number; todayOrders: number; openOrders: number;
  activeListings: number; lowStock: number; ratingAvg: number; ratingCount: number;
  last7: { date: string; salesKobo: number; orders: number }[]; recentOrders: OrderSummary[]; topProducts: { title: string; orders: number; views: number }[] }>
```
- [ ] **Step 1: Failing tests** for `validateHours`: accepts the presets; rejects "25:00", rejects close ≤ open, rejects 4 ranges on a day.
- [ ] **Step 2:** Implement and pass.
- [ ] **Step 3: Seller layout.**
  - `requireViewer`. With no business, every `/sell/*` path except onboarding redirects to `/sell/onboarding`.
  - `SellerNav`: a desktop left sidebar (Overview, Orders (open count), Products, Store settings, View storefront ↗). On mobile it's a horizontal tab strip under the header.
  - The shop MobileNav is still shown.
- [ ] **Step 4: Onboarding** is one page, not a wizard. Heading "Start selling on campus". Fields: business name, category, seller type radio (Student seller / Campus business), pickup location (select grouped by zone, with the help text "Choose a general area. Never share your room number here — you'll send exact pickup details privately per order."), tagline, delivery toggle + note, hours (presets: "After lectures", "Food hours", "Weekdays 10–6", "Custom" → `HoursEditor`). Submit "Create store". Unverified-email users get a callout: "Confirm your CU email to sell."
- [ ] **Step 5: Overview** (`/sell`):
  - Greeting row: store name plus a "View storefront" link.
  - Stat tiles (4, a 2×2 grid on mobile): Today's sales (₦), Open orders, Active listings (with "N low on stock" in warning when >0), Rating (★ avg · count).
  - "Last 7 days": a tiny inline bar list (no chart library). Each row shows the date label, a bar width proportional to sales, and the ₦ amount. It's skipped when all values are zero, replaced by the muted line "Sales will show here after your first order."
  - Recent orders (5) linking to `/sell/orders/[id]`.
  - Top listings (views/orders).
  - Quick actions row: Add product (primary), Manage products, View orders, Store settings.
  - New store with nothing: EmptyState "Add your first listing" / "Listings with clear photos and a pickup location sell faster." → `/sell/products/new`.
- [ ] **Step 6: Settings:** `BusinessForm` prefilled, plus logo upload (square crop via CSS, client-side resize to 512px webp with a canvas before upload).
- [ ] **Step 7: Verify.** Create a store as yourself. The overview shows zeros and empty states, not fake numbers. Edit hours and the storefront reflects them.
- [ ] **Step 8: Commit** `feat: seller onboarding, overview and store settings`.

---

### Task 20: Seller products — table, add/edit with image uploader

**Files:** Create `app/sell/products/page.tsx`, `app/sell/products/new/page.tsx`, `app/sell/products/[id]/page.tsx`, `components/sell/{ProductsTable,ProductForm,ImageUploader,VariantsEditor}.tsx`, `lib/actions/products.ts`, `lib/validation/product.ts` (+ `tests/product-validation.test.ts`), `lib/image-resize.ts` (client)

**Interfaces:**
```ts
// lib/validation/product.ts
productSchema: parses FormData-derived object → { title; kind; category_id; description; price_kobo; compare_at_kobo|null; condition;
  stock: number|null; pickup_location_id|null; allows_pickup; allows_delivery; delivery_note|null; status: "active"|"draft"|"paused";
  images: string[] (1..8 storage paths or URLs); variants: { name; value; stock|null; price_delta_kobo }[] (≤30) }
// lib/actions/products.ts
saveProduct(prev, formData): Promise<ActionResult & { id?: string }>   // create or update (hidden id); replaces images & variants in order
setProductStatus(id: string, status: "active" | "paused"): Promise<ActionResult>
duplicateProduct(id: string): Promise<ActionResult & { id?: string }>  // copies as draft "… (copy)", same image paths, variants
deleteProduct(id: string): Promise<ActionResult>                        // removes own storage objects not referenced elsewhere
// lib/image-resize.ts
resizeImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob>  // webp via canvas; keeps orientation via createImageBitmap
```
- [ ] **Step 1: Failing tests** for `productSchema`:
  - price "85,000" → 8500000
  - compare-at ≤ price → error "Compare-at price must be higher than the price"
  - no images → error "Add at least one photo"
  - neither pickup nor delivery → error
  - service kind → stock coerced to null
  - title of 1 char → error
- [ ] **Step 2:** Implement and pass.
- [ ] **Step 3: ProductsTable** (desktop table; stacked rows on mobile).
  - Columns: thumb+title, price, stock (warning when ≤3, danger "Sold out" at 0, "—" for null), status badge, views, orders, and a row menu (Edit, Pause/Activate, Duplicate, Delete with a confirm modal naming the product).
  - Search box and status filter tabs (All · Active · Paused · Drafts · Removed by admin).
  - Removed rows are read-only with the note "Removed by moderators".
- [ ] **Step 4: ProductForm.** Sections with small headings, in a single column (max-w 680):
  - **Photos:** `ImageUploader`
    - drop zone + file picker (accept jpeg/png/webp, max 8 images, each resized client-side, then uploaded directly with the browser client to `product-images/{businessId}/{uuid}.webp`)
    - a grid of previews with per-image upload progress (indeterminate bar) and remove buttons
    - drag-to-reorder with native HTML5 DnD on desktop, plus ← → buttons on each tile for touch and keyboard
    - the first image is labelled "Cover"
  - **Details:** title, kind (Product/Service segmented), category, description (counter)
  - **Pricing:** price (₦ prefix), optional compare-at
  - **Inventory:** condition (hidden for services), stock (an "Unlimited / made to order" checkbox sets null), `VariantsEditor` (name+value rows with optional stock and price delta; a "Sizes" quick-add for 38–45 or S–XXL)
  - **Fulfilment:** pickup toggle + location (defaults to the store location), delivery toggle + note
  - **Visibility:** Publish now / Save as draft
  - Sticky footer bar with Cancel and Save. Inline errors scroll to the first error. Unsaved changes trigger a beforeunload warning.
- [ ] **Step 5: Verify.** Create a product with 3 photos, reorder so the cover changes, publish, and see it on the storefront and in browse. Pause it and it disappears publicly. Duplicate creates a draft. Delete removes it. Uploading a 6MB phone photo works (resized under 1MB).
- [ ] **Step 6: Commit** `feat: seller product management with image uploader`.

---

### Task 21: Seller orders management

**Files:** Create `app/sell/orders/page.tsx`, `app/sell/orders/[id]/page.tsx`, `components/sell/OrderActions.tsx`, extend `lib/queries/seller.ts` with `getSellerOrders(status filter)`

- **List:** tabs New (pending) · In progress (confirmed/preparing/ready/out) · Completed · Cancelled, with counts. Rows show #, buyer first name + last initial + verified mark, items summary, total, fulfilment, age ("12 min ago"), and status.
- **Detail:**
  - Buyer (shortName, verified), items, buyer note, fulfilment, the timeline.
  - `OrderActions` shows buttons from `sellerNextStatuses` with clear labels: "Confirm order", "Start preparing", "Mark ready for pickup", "Mark out for delivery", "Mark completed", and "Cancel order" (danger, confirm modal with an optional reason posted as a message to the buyer).
  - A "Pickup details" textarea (visible from confirmed onward; required when marking ready for pickup if empty), placeholder "e.g. Daniel Hall reception, 6–8pm. Call when you arrive." Saved via `updateOrderStatus(id, sameStatus, instructions)`.
  - Message buyer button.
- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify end to end** with two browsers (you as buyer, and a second CU account, or ask the user, as seller): place → confirm (with pickup details) → ready → buyer "I've received it" → completed. Notifications appear for each step. The buyer sees the pickup details only after they're set; an outsider can't open the URL (404).
- [ ] **Step 3: Commit** `feat: seller order management with status updates`.

---

### Task 22: Reviews

**Files:** Create `app/(shop)/orders/[id]/review/page.tsx`, `components/market/{StarInput,ReviewForm}.tsx`, `lib/actions/reviews.ts`, `lib/validation/review.ts` (+ `tests/review-validation.test.ts`)

**Interfaces:**
```ts
reviewSchema: { order_id: uuid; product_id: uuid; rating: 1..5; quality?: 1..5; communication?: 1..5; accuracy?: 1..5; fulfilment_rating?: 1..5; body?: string ≤1000 }
submitReview(prev, formData): Promise<ActionResult>   // insert; REVIEW_NOT_ALLOWED → "You can review an order once it's completed."
```
- [ ] **Step 1: Failing tests:** rating 0 rejected; body over 1000 rejected; empty sub-ratings become undefined.
- [ ] **Step 2:** Implement and pass.
- [ ] **Step 3: Review page.**
  - One card per item in the completed order that hasn't been reviewed. Each card has the product thumbnail and title, an overall `StarInput` (radio group with arrow keys; labels Poor/Fair/Good/Very good/Excellent), an optional "Rate details" disclosure for the four sub-ratings, and an optional text area ("What should other students know?").
  - Submit for each card. After all are submitted, show a thank-you state and link back to the order.
  - Reviewed items show a read-only "You rated this ★4".
- [ ] **Step 4: Verify.** After completing an order in Task 21, review it. It appears on the product page and storefront with "✓ Verified purchase", and the averages update.
- [ ] **Step 5: Commit** `feat: verified-purchase reviews`.

---

### Task 23: Saved items

**Files:** Create `app/(shop)/saved/page.tsx`, `lib/actions/saved.ts`, `lib/queries/saved.ts`. Wire up `SaveButton` and `FollowButton`.

**Interfaces:**
```ts
toggleSavedProduct(productId: string): Promise<{ ok: boolean; saved: boolean; requiresAuth?: boolean }>
toggleSavedBusiness(businessId: string): Promise<{ ok: boolean; saved: boolean; requiresAuth?: boolean }>
getSavedProductIds(): Promise<Set<string>>       // used by grids to render initial state (one query per request)
getSaved(): Promise<{ products: (ProductCardData & { price_at_save_kobo: number | null; status: ProductStatus })[]; businesses: BusinessSummary[] }>
updateNotificationPrefs(prev, formData): Promise<ActionResult>
```
- The `SaveButton` is optimistic (`useOptimistic`), reverting with a toast on error. Signed out, it navigates to sign-in with `next` set to the current page.
- Page tabs: Products · Businesses.
  - Product cards show "Price dropped from ₦X" (success) when below the saved price, "Sold out" or "No longer available" (paused/removed) muted.
  - A "Notify me when…" settings card (3 toggles bound to the profile prefs) sits at the top of the Products tab as a compact row.
  - Empty states: "Nothing saved yet." / "Save products you're interested in and they'll show up here." and "No saved businesses." / "Follow businesses to hear when they list something new."
- [ ] **Step 1:** Implement. **Step 2: Verify:** save, then lower the price as the seller, and the saved page shows the drop and a notification exists. **Step 3: Commit** `feat: saved products and businesses with alerts`.

---

### Task 24: Messaging & notifications

**Files:** Create `app/(shop)/messages/page.tsx`, `app/(shop)/messages/[id]/page.tsx`, `components/messages/{ConversationList,Thread,Composer,QuickPrompts,ContextCard}.tsx`, `lib/queries/messages.ts`, `lib/actions/messages.ts`, `app/(shop)/notifications/page.tsx`, `lib/queries/notifications.ts`, `lib/actions/notifications.ts`, `components/layout/NotificationBell.tsx` (realtime)

**Interfaces:**
```ts
startConversation(businessId: string, productId?: string, orderId?: string): Promise<never>   // rpc start_conversation → redirect /messages/[id]
sendMessage(conversationId: string, body: string, ref?: { productId?: string; orderId?: string }): Promise<ActionResult & { id?: string }>
getInbox(): Promise<{ id: string; counterpart: { name: string; verified: boolean; avatar: string | null }; role: "buyer" | "seller";
  regarding: string | null; lastMessage: string | null; lastAt: string | null; unread: boolean }[]>
getThread(id: string): Promise<{ conversation; product: ProductCardData | null; order: { id; number; status } | null; messages: Message[] } | null>
markAllNotificationsRead(): Promise<void>; markNotificationRead(id: string): Promise<void>
```
**Messaging:**
- Desktop is two-pane (list 320px | thread); mobile shows the list page, then the thread page.
- Thread header: counterpart name + verified, and the line "Regarding: Nike Dunk Low" linking to the product, or "Order #1162".
- `ContextCard`: a slim product/order card pinned at the top of the thread.
- Bubbles: the viewer's own are right-aligned on bg-ink text-white; others are on bg-surface with border-line. Max-width 75%. Timestamps are grouped by day. Messages with `product_id`/`order_id` render an inline mini card.
- `QuickPrompts` show only when the thread is empty or the viewer is the buyer and the last message is theirs or there are none: "Is this available?", "Where can I pick this up?", "Can I order this today?", "Do you offer delivery?". Tapping one fills the composer (it doesn't send).
- Composer: a textarea that autogrows to 5 lines; Enter sends and Shift+Enter adds a newline (desktop); a Send button; sending is optimistic.
- Realtime: subscribe to `postgres_changes` INSERT on `messages` filtered by `conversation_id=eq.{id}`. Call `mark_conversation_read` on open and on each received message.
- The seller sees conversations for their business, labelled "Buyer".
- Empty inbox: "No messages yet." / "Questions you ask sellers will show up here."

**Notifications:**
- A list grouped by Today / Earlier with an icon per type (lucide: Package, MessageSquare, TrendingDown, PackageCheck, Store, Star). Unread items get a small accent dot and a slightly bolder title. Clicking marks read and navigates to `href`. "Mark all as read".
- The bell in the header shows the unread count (9+), updated live via a realtime subscription on `notifications` filtered by `user_id=eq.{uid}`, with a 2s fade-in highlight only.
- Empty: "You're all caught up." / "Order updates, replies and price drops will appear here."

- [ ] **Step 1:** Implement. **Step 2: Verify** with two sessions: message from the product page, the thread opens with the context, the reply appears live, the notification bell increments, and an outsider gets a 404 opening the thread URL. **Step 3: Commit** `feat: commerce-focused messaging and notification center`.

---

### Task 25: Trust & safety — report flow

**Files:** Create `components/market/ReportDialog.tsx`, `lib/actions/reports.ts`, `lib/validation/report.ts` (+ test), `app/(shop)/safety/page.tsx` (if not created in Task 9)

**Interfaces:** `submitReport(prev, formData)` takes `target_type`, `target_id`, `reason`, and `details` (required when reason=other, ≥10 chars). It allows at most 5 reports per user per hour; check the count with a select on the user's own reports.

- [ ] **Step 1: Failing tests:** "other" without details is rejected; an invalid reason is rejected.
- [ ] **Step 2:** Implement.
  - The dialog is a radio list of reasons with one-line descriptions: Fraud ("Took payment or tried to scam"), Wrong product ("Not what was described"), Counterfeit ("Fake branded item"), Harassment ("Abusive or threatening behaviour"), Spam ("Repeated or irrelevant listings"), Prohibited item ("Not allowed on campus or by law"), Other.
  - Details textarea and submit.
  - Success state: "Thanks — our moderators will review this. If you're in danger, contact campus security." with no fake response-time claims.
  - Signed out: prompt to sign in.
- [ ] **Step 3:** Use it on the product page (listing), storefront (business), order detail (business + order context in details), and each ReviewCard ("Report" in a small menu on hover/focus).
- [ ] **Step 4: Commit** `feat: report flow for listings, sellers and reviews`.

---

### Task 26: Admin

**Files:** Create `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/{reports,listings,sellers,users,categories,reviews}/page.tsx`, `components/admin/{AdminNav,DataTable,ResolveReportForm}.tsx`, `lib/queries/admin.ts`, `lib/actions/admin.ts`

**Interfaces:**
```ts
// lib/actions/admin.ts — every action calls requireAdmin() first (server), then relies on RLS admin policies
resolveReport(id, status: "reviewing"|"resolved"|"dismissed", note?: string)
setListingStatus(productId, status: "active"|"removed", reason?: string)   // notifies owner (type "moderation")
setBusinessVerified(businessId, verified: boolean)
setBusinessStatus(businessId, status: "active"|"suspended")
setUserRole(userId, role: "student"|"staff"|"admin")                      // cannot demote self
upsertCategory(formData) / toggleCategory(id, active)
setReviewHidden(reviewId, hidden: boolean)
```
- Layout: `requireAdmin()` (a 404 for others). A minimal sidebar: Overview, Reports (open count), Listings, Sellers, Users, Categories, Reviews.
- **Overview:** `marketplace_counts()` shown as 5 plain tiles (Active users 30d, Active sellers, Listings, Orders 30d, Reports needing attention), with a quiet note when demo data is present: "Includes no demo rows. {n} demo listings exist — run remove_demo.sql before launch." Real zeros show as "0", with no charts. A "Needs attention" list: open reports (5 newest) and unverified sellers (5 newest).
- **Reports:** a status filter. Each row shows reason badge, target (resolved link: product/business/user/review), reporter, age, details. Actions: Mark reviewing, Resolve (note), Dismiss, plus "Remove listing" or "Suspend seller" shortcuts based on target.
- **Listings:** search and status filter; remove or restore.
- **Sellers:** verify or unverify, suspend or reactivate; shows rating, listing count, created date.
- **Users:** search by name or email (admin can read profiles), role select, verified state.
- **Categories:** inline add/rename/reorder (sort number)/deactivate.
- **Reviews:** latest first; hide or unhide.
- `DataTable` is a simple semantic table, with stacked cards on mobile and server pagination via `?page`.
- [ ] **Step 1:** Implement. **Step 2 (USER):** `update public.profiles set role = 'admin' where email = '<your email>';` **Step 3: Verify:** the admin pages load for you and 404 for another account. Removing a listing hides it publicly and notifies the owner. Verifying a seller shows the badge on the storefront. **Step 4: Commit** `feat: admin moderation console`.

---

### Task 27: Account page and remaining states

**Files:** Create `app/(shop)/account/page.tsx`, `lib/actions/account.ts`; add `loading.tsx` to `browse`, `search`, `p/[slug]`, `b/[slug]`, `orders`, `sell`; and `app/(shop)/safety/page.tsx` content if missing.

- Account sections:
  - **Identity:** avatar initials, name, email (private), affiliation, and the verification state. Verified: "✓ Covenant Verified". Unverified: warning "Email not confirmed" with a Resend button.
  - **Selling:** a prominent "Start selling" or "Seller dashboard" card (this is the mobile Sell entry).
  - **Profile:** edit name and phone, with the note "Your phone number is never shown publicly."
  - **Notifications:** preference toggles.
  - **Your reports:** list with statuses.
  - **Admin console** link (admins only).
  - **Sign out.**
- The Safety page is concise and practical: meet in public campus spots (Student Centre, cafeterias); inspect before you pay; never pay before the seller confirms; keep conversations on CU Marketplace; how to report.
- Every async page gets a `loading.tsx` skeleton matching its layout.
- [ ] **Step 1:** Implement. **Step 2: Commit** `feat: account page, safety guide and loading states`.

---

### Task 28: Quality pass and README

**Files:** Modify anything found. Create `README.md`.

- [ ] **Step 1:** `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` all pass with zero errors.
- [ ] **Step 2: Browser walkthrough** at 375×812 and 1440×900, checking each screen against spec §35:
  - home, browse (filters + sheet), search (suggest + results), product, storefront, businesses, locations, cart (2 sellers), orders + detail, saved, messages, notifications, account
  - sell overview, products, new product, seller orders
  - admin pages
  - auth pages

  For each, confirm:
  - no horizontal scroll
  - prices are the most prominent number
  - seller identity and location are visible on every product surface
  - no decorative-only icons, gradients, or shadows on cards
  - empty states are present
  - keyboard focus is visible
  - images have alt text (product title)
- [ ] **Step 3: Performance check.** Run Lighthouse mobile on `/` and `/p/nike-dunk-low-panda` (production build via `npm start`). Target LCP < 2.5s on a desktop connection and no CLS > 0.05. Fix image `sizes`/`priority` if needed.
- [ ] **Step 4: Security check.**
  - `grep -r "service_role" .` returns nothing.
  - Every `lib/actions/*` mutation validates with Zod and depends on RLS/functions, not client-supplied owner ids.
  - Run `supabase/tests/rls.sql` again: PASSED.
- [ ] **Step 5: README:**
  - what it is
  - stack
  - setup (env, SQL order, auth URLs, making yourself admin)
  - scripts
  - demo data (`is_demo`, `remove_demo.sql`)
  - architecture notes (RLS, definer functions)
  - future features and where they plug in: `payment_status`/`payment_ref`, the `delivery` fulfilment, `listing_kind` for bookings
- [ ] **Step 6: Commit** `chore: quality pass and README`.

---

## Self-Review Notes

- **Spec coverage:** §4 data model → Tasks 3–5. §5 auth → Task 10. §6 IA → Tasks 9, 12–16. §7 design system → Tasks 1, 8, 11. §8 states → Tasks 8, 27, 28. §9 seed → Task 6. §10 testing → Tasks 2, 5, 28. §11 future-proofing → Task 3 columns and the README. Every user-brief feature maps to a task: saved notifications (23), messaging quick prompts (24), report categories (25), admin (26), campus map (16), split orders (17), timeline (18), dashboard (19), add product with reorder (20), verified-purchase reviews (22).
- **Placeholder scan:** UI tasks specify behaviour, interfaces and acceptance checks rather than full JSX. The foundational code (SQL, domain logic, clients) is given in full. The seed dataset is specified as a table plus rules; Task 6 Step 1 is the authoring step.
- **Type consistency:** `CartLine`, `OrderStatus`, `Fulfilment`, `ProductCardData`, `BusinessSummary`, `ReviewView`, `OrderSummary`, `ActionResult` and `BrowseParams` are defined once (Tasks 2, 10, 11, 15, 18) and referenced by the same names afterwards.
