import type { Metadata } from "next";
import { Heart, Store } from "lucide-react";
import { AlertPrefs } from "@/components/market/AlertPrefs";
import { BusinessCard } from "@/components/market/BusinessCard";
import { ProductCard } from "@/components/market/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { requireViewer } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { getSaved } from "@/lib/queries/saved";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage({ searchParams }: PageProps<"/saved">) {
  const viewer = await requireViewer("/saved");
  const sp = await searchParams;
  const tab = sp.tab === "businesses" ? "businesses" : "products";
  const supabase = await createClient();
  const [{ products, businesses }, { data: prefs }] = await Promise.all([
    getSaved(viewer.id),
    supabase.from("profiles").select("notify_price_drop, notify_back_in_stock, notify_new_listings").eq("id", viewer.id).single(),
  ]);

  return (
    <div className="pt-6 md:pt-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Saved</h1>
      <Tabs
        className="mt-4"
        active={tab}
        tabs={[
          { id: "products", label: "Products", count: products.length, href: "/saved" },
          { id: "businesses", label: "Businesses", count: businesses.length, href: "/saved?tab=businesses" },
        ]}
      />

      {tab === "products" ? (
        <>
          {prefs && (
            <div className="mt-4 rounded-card border border-line bg-surface px-4 py-3">
              <p className="mb-1 text-[13px] font-medium">Notify me when…</p>
              <AlertPrefs initial={prefs} />
            </div>
          )}
          {products.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => {
                const unavailable = p.status !== "active";
                const dropped = !unavailable && p.price_at_save_kobo !== null && p.price_kobo < p.price_at_save_kobo;
                return (
                  <div key={p.id} className={unavailable ? "opacity-60" : undefined}>
                    <ProductCard product={p} saved />
                    {dropped && <p className="mt-1 text-xs font-medium text-success">Price dropped from {formatNaira(p.price_at_save_kobo!)}</p>}
                    {unavailable && <p className="mt-1 text-xs text-muted">No longer available</p>}
                    {!unavailable && p.stock === 0 && <p className="mt-1 text-xs text-muted">Sold out. We&apos;ll tell you if it&apos;s back.</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState className="mt-6" icon={Heart} title="Nothing saved yet." body="Save products you're interested in and they'll show up here." action={{ label: "Browse the marketplace", href: "/browse" }} />
          )}
        </>
      ) : businesses.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businesses.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>
      ) : (
        <EmptyState className="mt-6" icon={Store} title="No saved businesses." body="Follow businesses to hear when they list something new." action={{ label: "Discover businesses", href: "/businesses" }} />
      )}
    </div>
  );
}
