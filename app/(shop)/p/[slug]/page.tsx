import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ChevronRight, MapPin } from "lucide-react";
import { OpenStatus } from "@/components/market/OpenStatus";
import { Price } from "@/components/market/Price";
import { ProductGallery } from "@/components/market/ProductGallery";
import { ProductGrid } from "@/components/market/ProductGrid";
import { PurchasePanel } from "@/components/market/PurchasePanel";
import { Rating } from "@/components/market/Rating";
import { RecentlyViewed } from "@/components/market/RecentlyViewed";
import { ReportDialog } from "@/components/market/ReportDialog";
import { ReviewCard } from "@/components/market/ReviewCard";
import { ReviewSummary } from "@/components/market/ReviewSummary";
import { Section } from "@/components/market/Section";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { getProduct, getProductReviews, getRatingSummary, getResponseStats, getSimilar } from "@/lib/queries/product";
import { getSavedProductIds } from "@/lib/queries/saved";
import { createPublicClient } from "@/lib/supabase/server";
import { formatRelative, formatResponseTime } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Listing not found" };
  return {
    title: product.title,
    description: `${formatNaira(product.price_kobo)} from ${product.business.name}${product.location ? ` · ${product.location.name}` : ""}`,
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

const CONDITION = { new: "New", like_new: "Like new", used: "Used" } as const;

function availability(stock: number | null, kind: "product" | "service") {
  if (kind === "service") return { text: "Available to book", tone: "text-success" };
  if (stock === null) return { text: "Made to order", tone: "text-success" };
  if (stock === 0) return { text: "Sold out", tone: "text-danger" };
  if (stock <= 3) return { text: `Only ${stock} left`, tone: "text-warning" };
  return { text: "In stock", tone: "text-success" };
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const [product, viewer] = await Promise.all([getProduct(slug), getViewer()]);
  if (!product) notFound();
  const isOwner = !!viewer && viewer.businessId === product.business.id;
  if (product.status !== "active" && !isOwner) notFound();

  const [reviews, summary, similar, stats, saved] = await Promise.all([
    getProductReviews(product.id),
    getRatingSummary("product_id", product.id),
    getSimilar(product),
    getResponseStats(product.business.id),
    getSavedProductIds(),
  ]);

  if (!isOwner && product.status === "active") {
    after(async () => {
      // cookies() is not available inside after(); the counter is a security-definer RPC, so the anon client is enough.
      const supabase = createPublicClient();
      await supabase.rpc("increment_product_view", { p_product_id: product.id });
    });
  }

  const avail = availability(product.stock, product.kind);
  const b = product.business;
  const messageHref = `/messages/start?business=${b.id}&product=${product.id}`;
  const facts: [string, React.ReactNode][] = [
    ...(product.kind === "product" ? [["Condition", CONDITION[product.condition]] as [string, React.ReactNode]] : []),
    ["Availability", <span key="a" className={avail.tone}>{avail.text}</span>],
    ["Pickup", product.allows_pickup ? product.location?.name ?? b.location?.name ?? "On campus" : "Not offered"],
    ["Delivery", product.allows_delivery ? `Available${product.delivery_note ?? b.delivery_note ? ` · ${product.delivery_note ?? b.delivery_note}` : ""}` : "Not offered"],
    ...(product.category ? [["Category", <Link key="c" href={`/browse?category=${product.category.slug}`} className="hover:underline">{product.category.name}</Link>] as [string, React.ReactNode]] : []),
    ["Listed", formatRelative(product.created_at)],
  ];

  return (
    <div className="pb-24 md:pb-0">
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1 pt-6 text-xs text-muted md:flex">
        <Link href="/browse" className="hover:text-ink">Marketplace</Link>
        {product.category && (
          <>
            <ChevronRight size={12} aria-hidden />
            <Link href={`/browse?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
          </>
        )}
      </nav>

      {product.status !== "active" && (
        <p className="mt-4 rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          This listing is {product.status === "removed" ? "removed by moderators" : product.status} — only you can see it.
        </p>
      )}

      <div className="grid gap-6 pt-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 md:pt-4">
        <ProductGallery images={product.images} title={product.title} placeholder={product.title} />

        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">{product.title}</h1>
          <Price kobo={product.price_kobo} compareAt={product.compare_at_kobo} size="xl" className="mt-2" />
          <p className={`mt-1 text-[13px] font-medium ${avail.tone}`}>{avail.text}</p>

          <Link href={`/b/${b.slug}`} className="mt-4 flex items-center gap-3 rounded-card border border-line bg-surface p-3 hover:border-line-strong">
            <Avatar name={b.name} src={b.logo_url} size={40} square />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium text-ink">
                <span className="truncate">{b.name}</span>
                {b.verified && <VerifiedBadge />}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Rating avg={b.rating_avg} count={b.rating_count} />
                {b.location && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{b.location.name}</span>
                  </>
                )}
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-faint" aria-hidden />
          </Link>

          <div className="mt-5">
            <PurchasePanel
              product={{ ...product, image: product.images[0] ?? null }}
              business={{ id: b.id, slug: b.slug, name: b.name }}
              saved={saved.has(product.id)}
              isOwner={isOwner}
              messageHref={messageHref}
            />
          </div>

          <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-surface text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <MapPin size={13} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden />
            Exact pickup details are shared privately after you order.
          </p>

          {product.description && (
            <div className="mt-6">
              <h2 className="text-[15px] font-semibold text-ink">Description</h2>
              <p className="mt-2 max-w-[65ch] text-[15px] leading-7 whitespace-pre-line text-ink">{product.description}</p>
            </div>
          )}

          {!isOwner && (
            <div className="mt-6">
              <ReportDialog targetType="product" targetId={product.id} label="Report listing" title="Report this listing" signedIn={!!viewer} />
            </div>
          )}
        </div>
      </div>

      <Section title="About the seller">
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center">
          <Avatar name={b.name} src={b.logo_url} size={56} square />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
              {b.name}
              {b.verified && <VerifiedBadge />}
            </p>
            {b.tagline && <p className="text-sm text-muted">{b.tagline}</p>}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <OpenStatus hours={b.hours} />
              {stats && stats.avg_response_minutes !== null && (
                <span>
                  Usually replies within {formatResponseTime(stats.avg_response_minutes)}
                  {stats.response_rate !== null && ` · ${Math.round(Number(stats.response_rate) * 100)}% response rate`}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/b/${b.slug}`} className={buttonClass("secondary", "sm")}>Visit store</Link>
            {!isOwner && <Link href={messageHref} className={buttonClass("secondary", "sm")}>Message</Link>}
          </div>
        </div>
      </Section>

      <Section title="Reviews" id="reviews" href={summary.count > reviews.length ? `/b/${b.slug}#reviews` : undefined} linkLabel="All store reviews">
        {summary.count ? (
          <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] md:gap-10">
            <ReviewSummary summary={summary} />
            <div>{reviews.map((r) => <ReviewCard key={r.id} review={r} action={<ReportDialog targetType="review" targetId={r.id} label="Report" title="Report this review" signedIn={!!viewer} />} />)}</div>
          </div>
        ) : (
          <p className="text-sm text-muted">No reviews for this listing yet. Reviews come only from buyers who completed an order.</p>
        )}
      </Section>

      {similar.length > 0 && (
        <Section title="Similar items" href={product.category ? `/browse?category=${product.category.slug}` : undefined}>
          <ProductGrid variant="rail" products={similar} savedIds={saved} />
        </Section>
      )}

      <RecentlyViewed currentId={product.id} />
    </div>
  );
}
