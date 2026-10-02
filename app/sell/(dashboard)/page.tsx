import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { OrderRow } from "@/components/market/OrderRow";
import { StatTile } from "@/components/sell/StatTile";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireSeller } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { getSellerBusiness, getSellerOverview } from "@/lib/queries/seller";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerOverviewPage({ searchParams }: PageProps<"/sell">) {
  const seller = await requireSeller();
  const [business, o, sp] = await Promise.all([getSellerBusiness(seller.businessId), getSellerOverview(seller.businessId), searchParams]);
  if (!business) return null;
  const maxSales = Math.max(...o.last7.map((d) => d.salesKobo), 1);
  const hasSales = o.last7.some((d) => d.salesKobo > 0);

  return (
    <div className="space-y-8">
      {sp.welcome && (
        <div className="rounded-card border border-success/25 bg-success-soft p-4 text-sm">
          <p className="font-medium text-ink">Your store is live.</p>
          <p className="mt-0.5 text-muted">Add a listing so buyers can find you. Clear photos and an accurate pickup area sell faster.</p>
        </div>
      )}
      {business.status === "suspended" && (
        <p className="rounded-card border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          Your store is suspended and hidden from buyers. Contact the moderators if you think this is a mistake.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{business.name}</h1>
          <p className="text-[13px] text-muted">{business.verified ? "Covenant Verified seller" : "Not yet verified by moderators"}</p>
        </div>
        <Link href="/sell/products/new" className={buttonClass("primary", "md")}>
          <PackagePlus size={16} strokeWidth={1.75} aria-hidden /> Add product
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Today's sales" value={formatNaira(o.todaySalesKobo)} detail={`${o.todayOrders} ${o.todayOrders === 1 ? "order" : "orders"} today`} />
        <StatTile label="Open orders" value={o.openOrders} detail={o.newOrders ? `${o.newOrders} waiting for you to confirm` : "Nothing waiting"} href="/sell/orders" />
        <StatTile
          label="Active listings"
          value={o.activeListings}
          detail={o.lowStock ? <span className="text-warning">{o.lowStock} low on stock</span> : "Stock looks fine"}
          href="/sell/products"
        />
        <StatTile
          label="Rating"
          value={business.rating_count ? `★ ${business.rating_avg.toFixed(1)}` : "—"}
          detail={business.rating_count ? `${business.rating_count} ${business.rating_count === 1 ? "review" : "reviews"}` : "No reviews yet"}
        />
      </div>

      {o.activeListings === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Add your first listing"
          body="Listings with clear photos and a pickup location sell faster."
          action={{ label: "Add product", href: "/sell/products/new" }}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Recent orders</h2>
              <Link href="/sell/orders" className="text-[13px] text-muted hover:text-ink">All orders</Link>
            </div>
            {o.recentOrders.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                {o.recentOrders.map((order) => <OrderRow key={order.id} order={order} href={`/sell/orders/${order.id}`} perspective="seller" />)}
              </ul>
            ) : (
              <p className="rounded-card border border-dashed border-line-strong p-5 text-sm text-muted">No orders yet. Share your storefront link to get your first one.</p>
            )}
          </section>

          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-[15px] font-semibold">Last 7 days</h2>
              {hasSales ? (
                <ul className="space-y-2 rounded-card border border-line bg-surface p-4">
                  {o.last7.map((d) => (
                    <li key={d.date} className="grid grid-cols-[44px_minmax(0,1fr)_88px] items-center gap-3 text-xs">
                      <span className="text-muted">{d.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-subtle">
                        <span className="block h-full rounded-full bg-ink" style={{ width: `${(d.salesKobo / maxSales) * 100}%` }} />
                      </span>
                      <span className="tabular text-right text-ink">{formatNaira(d.salesKobo)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Sales will show here after your first order.</p>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-[15px] font-semibold">Top listings</h2>
              <ul className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
                {o.topProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link href={`/p/${p.slug}`} className="truncate hover:underline">{p.title}</Link>
                    <span className="tabular shrink-0 text-xs text-muted">{p.orders} orders · {p.views} views</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-6">
        <Link href="/sell/products" className={buttonClass("secondary", "sm")}>Manage products</Link>
        <Link href="/sell/orders" className={buttonClass("secondary", "sm")}>View orders</Link>
        <Link href="/sell/settings" className={buttonClass("secondary", "sm")}>Store settings</Link>
      </div>
    </div>
  );
}
