import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ActiveFilters, MobileFilters, SortSelect } from "@/components/market/BrowseControls";
import { BrowseResults, BrowseState } from "@/components/market/BrowseState";
import { FilterPanel } from "@/components/market/FilterPanel";
import { ProductGrid } from "@/components/market/ProductGrid";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseBrowseParams, toSearchParams } from "@/lib/browse-params";
import { browseProducts } from "@/lib/queries/catalog";
import { getCategories, getLocations } from "@/lib/queries/reference";
import { getSavedProductIds } from "@/lib/queries/saved";

export async function generateMetadata({ searchParams }: PageProps<"/browse">): Promise<Metadata> {
  const p = parseBrowseParams(await searchParams);
  const cat = p.category ? (await getCategories()).find((c) => c.slug === p.category)?.name : null;
  return { title: cat ?? (p.kind === "service" ? "Services" : "Marketplace") };
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = parseBrowseParams(await searchParams);
  const [categories, locations, result, saved] = await Promise.all([getCategories(), getLocations(), browseProducts(params), getSavedProductIds()]);
  const { items, total } = result;
  const page = params.page ?? 1;
  const heading = params.category
    ? categories.find((c) => c.slug === params.category)?.name ?? "Marketplace"
    : params.kind === "service" ? "Services" : params.q ? `Results for “${params.q}”` : "Marketplace";
  const moreHref = `/browse?${toSearchParams({ ...params, page: page + 1 }).toString()}`;

  return (
    <BrowseState params={params}>
      <div className="pt-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10 lg:pt-8">
        <aside className="hidden lg:block">
          <div className="no-scrollbar sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-6">
            <FilterPanel categories={categories} locations={locations} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">{heading}</h1>
              <p className="tabular mt-0.5 text-[13px] text-muted">
                {total.toLocaleString("en-NG")} {total === 1 ? "result" : "results"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MobileFilters categories={categories} locations={locations} total={total} />
              <SortSelect />
            </div>
          </div>
          <div className="mt-3">
            <ActiveFilters categories={categories} locations={locations} />
          </div>

          <BrowseResults>
            {items.length ? (
              <>
                <ProductGrid products={items} savedIds={saved} priorityCount={4} className="mt-5 lg:grid-cols-3 xl:grid-cols-4" />
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="tabular text-[13px] text-muted">
                    Showing {items.length.toLocaleString("en-NG")} of {total.toLocaleString("en-NG")}
                  </p>
                  {items.length < total && (
                    <Link href={moreHref} scroll={false} className={buttonClass("secondary", "md")}>
                      Load more
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                className="mt-6"
                icon={SearchX}
                title="Nothing matched your search."
                body="Try a different keyword or remove a filter."
                action={{ label: "Clear filters", href: params.q ? `/browse?q=${encodeURIComponent(params.q)}` : "/browse" }}
              />
            )}
          </BrowseResults>
        </div>
      </div>
    </BrowseState>
  );
}
