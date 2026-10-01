import { Suspense } from "react";
import { BusinessCard } from "@/components/market/BusinessCard";
import { CategoryRail } from "@/components/market/CategoryRail";
import { LocationPicker } from "@/components/market/LocationPicker";
import { ProductGrid } from "@/components/market/ProductGrid";
import { SearchBar } from "@/components/market/SearchBar";
import { Section } from "@/components/market/Section";
import { BusinessGridSkeleton, ProductGridSkeleton, ProductRailSkeleton } from "@/components/market/skeletons";
import { getLocationPref } from "@/lib/location-pref";
import { getBusinessesNear, getNewBusinesses } from "@/lib/queries/businesses";
import { getPopularServices, getRecentlyListed, getTrending } from "@/lib/queries/catalog";
import { getCategories, getLocations } from "@/lib/queries/reference";
import { getSavedProductIds } from "@/lib/queries/saved";

async function Trending() {
  const [products, saved] = await Promise.all([getTrending(12), getSavedProductIds()]);
  return <ProductGrid variant="rail" products={products} savedIds={saved} priorityCount={2} />;
}

async function Recent() {
  const [products, saved] = await Promise.all([getRecentlyListed(12), getSavedProductIds()]);
  return <ProductGrid variant="rail" products={products} savedIds={saved} />;
}

async function Services() {
  const [products, saved] = await Promise.all([getPopularServices(8), getSavedProductIds()]);
  return <ProductGrid products={products} savedIds={saved} className="lg:grid-cols-4 xl:grid-cols-4" />;
}

async function NearYou() {
  const [pref, locations] = await Promise.all([getLocationPref(), getLocations()]);
  const businesses = await getBusinessesNear(pref, 8);
  return (
    <Section
      title={pref ? "Businesses near you" : "Popular businesses"}
      href={pref ? "/businesses?sort=near" : "/businesses"}
      aside={<LocationPicker locations={locations} current={pref} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {businesses.map((b) => <BusinessCard key={b.id} business={b} />)}
      </div>
    </Section>
  );
}

async function NewOnCampus() {
  const businesses = await getNewBusinesses(8);
  if (!businesses.length) return null;
  return (
    <Section title="New on campus" href="/businesses?sort=new">
      <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:px-0">
        {businesses.map((b) => <BusinessCard key={b.id} business={b} compact />)}
      </div>
    </Section>
  );
}

export default async function HomePage() {
  const categories = await getCategories();
  return (
    <>
      <div className="pt-6 pb-2 md:pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-[28px]">Find it on campus.</h1>
        <p className="mt-1.5 max-w-xl text-[15px] text-muted">
          Discover products, services and student businesses around Covenant University.
        </p>
        <div className="mt-5 max-w-2xl">
          <SearchBar size="lg" />
        </div>
      </div>

      <Section title="Popular categories" className="pt-6 md:pt-8">
        <CategoryRail categories={categories} />
      </Section>

      <Section title="Trending on campus" href="/browse?sort=recommended">
        <Suspense fallback={<ProductRailSkeleton />}>
          <Trending />
        </Suspense>
      </Section>

      <Suspense fallback={<Section title="Popular businesses"><BusinessGridSkeleton count={4} /></Section>}>
        <NearYou />
      </Suspense>

      <Section title="Recently listed" href="/browse?sort=newest">
        <Suspense fallback={<ProductRailSkeleton />}>
          <Recent />
        </Suspense>
      </Section>

      <Section title="Popular services" href="/browse?kind=service">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Services />
        </Suspense>
      </Section>

      <Suspense fallback={null}>
        <NewOnCampus />
      </Suspense>
    </>
  );
}
