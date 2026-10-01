import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { BusinessCard } from "@/components/market/BusinessCard";
import { Section } from "@/components/market/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { getLocationPref } from "@/lib/location-pref";
import { listBusinesses, type BusinessCardData, type BusinessSort } from "@/lib/queries/businesses";
import { getCategories } from "@/lib/queries/reference";

export const metadata: Metadata = { title: "Businesses" };

const SORTS: { value: BusinessSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "rating", label: "Highest rated" },
  { value: "new", label: "Newest" },
  { value: "near", label: "Near me" },
];

function Grid({ businesses }: { businesses: BusinessCardData[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {businesses.map((b) => <BusinessCard key={b.id} business={b} />)}
    </div>
  );
}

export default async function BusinessesPage({ searchParams }: PageProps<"/businesses">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort = SORTS.find((s) => s.value === sp.sort)?.value ?? "popular";
  const openNow = sp.open === "1";
  const [all, categories, near] = await Promise.all([listBusinesses({ sort: sort === "near" ? "popular" : sort }), getCategories(), getLocationPref()]);

  const counts = new Map<string, number>();
  all.forEach((b) => b.category && counts.set(b.category.slug, (counts.get(b.category.slug) ?? 0) + 1));
  const usedCategories = categories.filter((c) => counts.has(c.slug));

  const filtered = await (category || openNow || sort !== "popular"
    ? listBusinesses({ category, openNow, sort, near })
    : Promise.resolve(all));
  const unfiltered = !category && !openNow && sort === "popular";

  const href = (patch: Record<string, string | undefined>) => {
    const s = new URLSearchParams({ ...(category ? { category } : {}), ...(sort !== "popular" ? { sort } : {}), ...(openNow ? { open: "1" } : {}) });
    Object.entries(patch).forEach(([k, v]) => (v ? s.set(k, v) : s.delete(k)));
    const str = s.toString();
    return `/businesses${str ? `?${str}` : ""}`;
  };

  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const favourites = all.filter((b) => b.rating_avg >= 4.5 && b.rating_count >= 6).sort((a, b) => b.rating_avg - a.rating_avg).slice(0, 4);
  const newOnCampus = all.filter((b) => new Date(b.created_at).getTime() > monthAgo).slice(0, 4);

  return (
    <>
      <div className="pt-6 md:pt-10">
        <h1 className="text-[22px] font-semibold tracking-tight">Businesses</h1>
        <p className="mt-1 text-[15px] text-muted">Student sellers and campus businesses, all in one place.</p>
      </div>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Link href={href({ category: undefined })} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[13px]", !category ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-subtle")}>
          All
        </Link>
        {usedCategories.map((c) => (
          <Link key={c.slug} href={href({ category: c.slug })} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[13px]", category === c.slug ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-subtle")}>
            {c.name} <span className="tabular text-faint">{counts.get(c.slug)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <div className="flex gap-3">
          {SORTS.map((s) => (
            <Link key={s.value} href={href({ sort: s.value === "popular" ? undefined : s.value })} className={sort === s.value ? "font-medium text-ink" : "text-muted hover:text-ink"}>
              {s.label}
            </Link>
          ))}
        </div>
        <span className="h-4 w-px bg-line" aria-hidden />
        <Link href={href({ open: openNow ? undefined : "1" })} aria-pressed={openNow} className={cn("inline-flex items-center gap-1.5", openNow ? "font-medium text-success" : "text-muted hover:text-ink")}>
          <span className={cn("size-1.5 rounded-full", openNow ? "bg-success" : "bg-line-strong")} aria-hidden />
          Open now
        </Link>
        {sort === "near" && !near && <span className="text-xs text-muted">Set your hall on the home page to sort by distance.</span>}
      </div>

      {unfiltered ? (
        <>
          {favourites.length > 0 && <Section title="Student favourites"><Grid businesses={favourites} /></Section>}
          {newOnCampus.length > 0 && <Section title="New on campus"><Grid businesses={newOnCampus} /></Section>}
          <Section title={`All businesses · ${all.length}`}><Grid businesses={all} /></Section>
        </>
      ) : filtered.length ? (
        <div className="pt-6"><Grid businesses={filtered} /></div>
      ) : (
        <EmptyState className="mt-6" icon={Store} title={openNow ? "Nothing open right now." : "No businesses here yet."} body={openNow ? "Try again later, or remove the Open now filter." : "Check back soon, or browse another category."} action={{ label: "See all businesses", href: "/businesses" }} />
      )}
    </>
  );
}
