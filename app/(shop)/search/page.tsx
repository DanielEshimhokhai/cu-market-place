import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { BusinessCard } from "@/components/market/BusinessCard";
import { CategoryRail } from "@/components/market/CategoryRail";
import { ProductGrid } from "@/components/market/ProductGrid";
import { RecentSearches } from "@/components/market/RecentSearches";
import { SearchBar } from "@/components/market/SearchBar";
import { Section } from "@/components/market/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { getCategories } from "@/lib/queries/reference";
import { getSavedProductIds } from "@/lib/queries/saved";
import { searchAll } from "@/lib/queries/search";
import { POPULAR_SEARCHES } from "@/lib/popular-searches";
import { normalizeQuery } from "@/lib/search";

type Tab = "all" | "products" | "services" | "businesses";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = normalizeQuery((await searchParams).q as string | undefined);
  return { title: q ? `“${q}”` : "Search" };
}

function PopularChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {POPULAR_SEARCHES.map((p) => (
        <Link key={p} href={`/search?q=${encodeURIComponent(p)}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] hover:bg-subtle">
          {p}
        </Link>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = normalizeQuery(typeof sp.q === "string" ? sp.q : "");
  const tab: Tab = (["all", "products", "services", "businesses"] as const).find((t) => t === sp.tab) ?? "all";

  const header = (
    <div className="pt-4 md:pt-8">
      <div className="max-w-2xl">
        <SearchBar key={q} size="lg" defaultValue={q} autoFocus={!q} />
      </div>
    </div>
  );

  if (!q) {
    const categories = await getCategories();
    return (
      <>
        <h1 className="sr-only">Search</h1>
        {header}
        <RecentSearches />
        <section className="pt-6">
          <h2 className="mb-2 text-[13px] font-semibold text-muted">Popular on campus</h2>
          <PopularChips />
        </section>
        <section className="pt-6">
          <h2 className="mb-2 text-[13px] font-semibold text-muted">Browse by category</h2>
          <CategoryRail categories={categories} />
        </section>
      </>
    );
  }

  const [{ products, services, businesses }, saved] = await Promise.all([searchAll(q), getSavedProductIds()]);
  const href = (t: Tab) => `/search?q=${encodeURIComponent(q)}${t === "all" ? "" : `&tab=${t}`}`;
  const tabs = [
    { id: "all", label: "All", href: href("all") },
    { id: "products", label: "Products", count: products.total, href: href("products") },
    { id: "services", label: "Services", count: services.total, href: href("services") },
    { id: "businesses", label: "Businesses", count: businesses.length, href: href("businesses") },
  ];
  const nothing = !products.total && !services.total && !businesses.length;
  const refine = (kind: "product" | "service") => `/browse?q=${encodeURIComponent(q)}&kind=${kind}`;

  return (
    <>
      {header}
      <h1 className="sr-only">Results for {q}</h1>
      <Tabs tabs={tabs} active={tab} className="mt-5" />

      {nothing ? (
        <EmptyState className="mt-6" icon={SearchX} title="Nothing matched your search." body="Try a different keyword or remove a filter.">
          <div className="flex justify-start md:justify-center">
            <PopularChips />
          </div>
        </EmptyState>
      ) : (
        <>
          {(tab === "all" || tab === "products") && products.total > 0 && (
            <Section
              title={tab === "all" ? "Products" : `${products.total} product${products.total === 1 ? "" : "s"}`}
              href={tab === "all" ? href("products") : refine("product")}
              linkLabel={tab === "all" ? "See all" : "Refine with filters"}
              className="pt-6"
            >
              <ProductGrid products={tab === "all" ? products.items.slice(0, 10) : products.items} savedIds={saved} />
            </Section>
          )}
          {(tab === "all" || tab === "businesses") && businesses.length > 0 && (
            <Section title="Businesses" href={tab === "all" && businesses.length > 4 ? href("businesses") : undefined} className="pt-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(tab === "all" ? businesses.slice(0, 4) : businesses).map((b) => <BusinessCard key={b.id} business={b} />)}
              </div>
            </Section>
          )}
          {(tab === "all" || tab === "services") && services.total > 0 && (
            <Section
              title={tab === "all" ? "Services" : `${services.total} service${services.total === 1 ? "" : "s"}`}
              href={tab === "all" ? href("services") : refine("service")}
              linkLabel={tab === "all" ? "See all" : "Refine with filters"}
              className="pt-8"
            >
              <ProductGrid products={tab === "all" ? services.items.slice(0, 5) : services.items} savedIds={saved} />
            </Section>
          )}
          {tab !== "all" &&
            ((tab === "products" && !products.total) || (tab === "services" && !services.total) || (tab === "businesses" && !businesses.length)) && (
              <EmptyState className="mt-6" icon={SearchX} title="Nothing matched your search." body="Try the All tab, or a different keyword." />
            )}
        </>
      )}
    </>
  );
}
