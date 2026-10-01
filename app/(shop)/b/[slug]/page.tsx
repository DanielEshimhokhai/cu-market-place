import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { FollowButton } from "@/components/market/FollowButton";
import { HoursTable } from "@/components/market/HoursTable";
import { OpenStatus } from "@/components/market/OpenStatus";
import { ProductGrid } from "@/components/market/ProductGrid";
import { Rating } from "@/components/market/Rating";
import { ReviewCard } from "@/components/market/ReviewCard";
import { ReviewSummary } from "@/components/market/ReviewSummary";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getViewer } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getSavedBusinessIds, getSavedProductIds } from "@/lib/queries/saved";
import { getStorefront } from "@/lib/queries/storefront";
import { formatMonthYear, formatResponseTime } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const store = await getStorefront((await params).slug);
  if (!store) return { title: "Store not found" };
  const b = store.business;
  return { title: b.name, description: b.tagline ?? `${b.category?.name ?? "Campus business"} at ${b.location?.name ?? "Covenant University"}` };
}

export default async function StorefrontPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [store, viewer] = await Promise.all([getStorefront(slug), getViewer()]);
  if (!store) notFound();
  const { business: b, reviews, summary, stats } = store;
  const isOwner = viewer?.businessId === b.id;
  if (b.status !== "active" && !isOwner && viewer?.role !== "admin") notFound();

  const [savedProducts, savedBusinesses] = await Promise.all([getSavedProductIds(), getSavedBusinessIds()]);
  const cat = typeof sp.cat === "string" ? sp.cat : undefined;
  const sort = sp.sort === "price_asc" || sp.sort === "price_desc" ? sp.sort : "newest";
  const categories = [...new Map(store.products.filter((p) => p.categorySlug).map((p) => [p.categorySlug!, p.categoryName!])).entries()];
  let products = cat ? store.products.filter((p) => p.categorySlug === cat) : store.products;
  if (sort !== "newest") products = [...products].sort((x, y) => (sort === "price_asc" ? x.price_kobo - y.price_kobo : y.price_kobo - x.price_kobo));
  const qs = (patch: Record<string, string | undefined>) => {
    const s = new URLSearchParams({ ...(cat ? { cat } : {}), ...(sort !== "newest" ? { sort } : {}) });
    Object.entries(patch).forEach(([k, v]) => (v ? s.set(k, v) : s.delete(k)));
    const str = s.toString();
    return `/b/${b.slug}${str ? `?${str}` : ""}#products`;
  };
  const messageHref = `/messages/start?business=${b.id}`;

  const info: [string, React.ReactNode][] = [
    ["Seller type", b.seller_type === "business" ? "Campus business" : "Student seller"],
    ...(b.category ? [["Category", b.category.name] as [string, React.ReactNode]] : []),
    ["Pickup location", b.location ? <Link key="l" href={`/locations/${b.location.slug}`} className="hover:underline">{b.location.name}</Link> : "Not set"],
    ["Delivery", b.offers_delivery ? `Offered${b.delivery_note ? ` · ${b.delivery_note}` : ""}` : "Pickup only"],
    ...(stats && stats.avg_response_minutes !== null
      ? [["Response time", `Usually within ${formatResponseTime(stats.avg_response_minutes)}`] as [string, React.ReactNode]]
      : []),
    ...(stats && stats.response_rate !== null ? [["Response rate", `${Math.round(Number(stats.response_rate) * 100)}%`] as [string, React.ReactNode]] : []),
    ["On CU Marketplace since", formatMonthYear(b.created_at)],
  ];

  return (
    <>
      {b.status !== "active" && (
        <p className="mt-4 rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">This store is suspended and hidden from buyers.</p>
      )}
      <header className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start md:pt-10">
        <Avatar name={b.name} src={b.logo_url} size={64} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">{b.name}</h1>
          {b.verified && <VerifiedBadge label className="mt-1" />}
          {b.tagline && <p className="mt-1.5 text-[15px] text-muted">{b.tagline}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <Rating avg={b.rating_avg} count={b.rating_count} showCount={false} />
            {b.rating_count > 0 && <a href="#reviews" className="hover:text-ink">({b.rating_count} {b.rating_count === 1 ? "review" : "reviews"})</a>}
            {b.category && <><span aria-hidden>·</span><span>{b.category.name}</span></>}
            {b.location && <><span aria-hidden>·</span><span>{b.location.name}</span></>}
          </p>
          <OpenStatus hours={b.hours} className="mt-1.5 text-[13px]" />
        </div>
        <div className="flex gap-2">
          {isOwner ? (
            <Link href="/sell" className={buttonClass("secondary", "sm")}>Seller dashboard</Link>
          ) : (
            <>
              <Link href={messageHref} className={buttonClass("primary", "sm")}>Message</Link>
              <FollowButton businessId={b.id} following={savedBusinesses.has(b.id)} />
            </>
          )}
        </div>
      </header>

      <nav className="sticky top-14 z-20 -mx-4 mt-6 flex gap-5 border-b border-line bg-canvas px-4 md:top-16 md:mx-0 md:px-0" aria-label="Store sections">
        {[["products", `Products`, store.products.length], ["reviews", "Reviews", summary.count], ["about", "About", undefined]].map(([id, label, count]) => (
          <a key={id as string} href={`#${id}`} className="-mb-px flex h-11 items-center gap-1.5 border-b-2 border-transparent text-sm text-muted hover:border-line-strong hover:text-ink">
            {label}
            {typeof count === "number" && <span className="tabular text-xs text-faint">{count}</span>}
          </a>
        ))}
      </nav>

      <section id="products" className="scroll-mt-32 pt-6">
        {store.products.length ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
                {[[undefined, "All"] as const, ...categories].map(([slugVal, name]) => (
                  <Link
                    key={name}
                    href={qs({ cat: slugVal })}
                    scroll={false}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-[13px]",
                      cat === slugVal ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink hover:bg-subtle",
                    )}
                  >
                    {name}
                  </Link>
                ))}
              </div>
              <div className="flex gap-3 text-[13px]">
                {(["newest", "price_asc", "price_desc"] as const).map((s) => (
                  <Link key={s} href={qs({ sort: s === "newest" ? undefined : s })} scroll={false} className={sort === s ? "font-medium text-ink" : "text-muted hover:text-ink"}>
                    {{ newest: "Newest", price_asc: "Price ↑", price_desc: "Price ↓" }[s]}
                  </Link>
                ))}
              </div>
            </div>
            <ProductGrid products={products} savedIds={savedProducts} priorityCount={4} />
          </>
        ) : (
          <EmptyState icon={PackageOpen} title="No listings yet." body={isOwner ? "Add your first listing so buyers can find you." : "This store hasn't listed anything yet. Follow to hear when they do."} action={isOwner ? { label: "Add a listing", href: "/sell/products/new" } : undefined} />
        )}
      </section>

      <section id="reviews" className="scroll-mt-32 pt-12">
        <h2 className="mb-4 text-[17px] font-semibold tracking-tight">Reviews</h2>
        {summary.count ? (
          <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] md:gap-10">
            <ReviewSummary summary={summary} />
            <div>{reviews.map((r) => <ReviewCard key={r.id} review={r} showProduct />)}</div>
          </div>
        ) : (
          <p className="text-sm text-muted">No reviews yet. Only buyers with a completed order can leave one.</p>
        )}
      </section>

      <section id="about" className="scroll-mt-32 pt-12">
        <h2 className="mb-4 text-[17px] font-semibold tracking-tight">About</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            {b.description && <p className="max-w-[60ch] text-[15px] leading-7 text-ink">{b.description}</p>}
            <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
              {info.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Opening hours</h3>
            <HoursTable hours={b.hours} />
            <p className="mt-4 text-xs text-muted">Exact pickup details are shared privately after you order.</p>
            {!isOwner && (
              <a href="#report" id="report" className="mt-4 inline-block text-xs text-muted hover:text-ink">Report this business</a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
