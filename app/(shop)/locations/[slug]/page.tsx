import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { BusinessCard } from "@/components/market/BusinessCard";
import { CampusMap } from "@/components/market/CampusMap";
import { ProductGrid } from "@/components/market/ProductGrid";
import { Section } from "@/components/market/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { listBusinesses } from "@/lib/queries/businesses";
import { browseProducts } from "@/lib/queries/catalog";
import { getLocationsWithCounts } from "@/lib/queries/locations";
import { ZONE_LABEL } from "@/lib/queries/reference";
import { getSavedProductIds } from "@/lib/queries/saved";

export async function generateMetadata({ params }: PageProps<"/locations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const loc = (await getLocationsWithCounts()).find((l) => l.slug === slug);
  return { title: loc ? `Sellers at ${loc.name}` : "Location" };
}

export default async function LocationPage({ params }: PageProps<"/locations/[slug]">) {
  const { slug } = await params;
  const locations = await getLocationsWithCounts();
  const loc = locations.find((l) => l.slug === slug);
  if (!loc) notFound();

  const [businesses, products, saved, nearbyAll] = await Promise.all([
    listBusinesses({ location: slug }),
    browseProducts({ location: slug }),
    getSavedProductIds(),
    listBusinesses({ sort: "near", near: slug, limit: 12 }),
  ]);
  const nearby = nearbyAll.filter((b) => b.location?.slug !== slug).slice(0, 4);

  return (
    <>
      <div className="pt-6 md:pt-10">
        <p className="text-xs text-muted">
          <Link href="/locations" className="hover:text-ink">Campus map</Link> · {ZONE_LABEL[loc.zone]}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-[22px] font-semibold tracking-tight">
          <MapPin size={20} strokeWidth={1.75} className="text-accent" aria-hidden />
          {loc.name}
        </h1>
      </div>
      <CampusMap locations={locations} highlight={slug} className="mt-5 md:max-w-md" />

      {businesses.length ? (
        <Section title={`Businesses here · ${businesses.length}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{businesses.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
        </Section>
      ) : (
        <EmptyState className="mt-8" icon={MapPin} title="No sellers here yet." body="Selling from this spot? Set it as your pickup location when you open your store." action={{ label: "Start selling", href: "/sell/onboarding" }} />
      )}

      {products.total > 0 && (
        <Section title="Pick up here" href={`/browse?location=${slug}`}>
          <ProductGrid variant="rail" products={products.items.slice(0, 12)} savedIds={saved} />
        </Section>
      )}

      {nearby.length > 0 && (
        <Section title="Nearby">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{nearby.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
        </Section>
      )}
    </>
  );
}
