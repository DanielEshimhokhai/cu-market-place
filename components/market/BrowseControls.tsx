"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { BottomSheet } from "@/components/ui/Modal";
import { activeFilterCount, SORT_OPTIONS, type BrowseParams, type BrowseSort } from "@/lib/browse-params";
import type { Category, Location } from "@/lib/types";
import { useBrowse } from "./BrowseState";
import { FilterPanel } from "./FilterPanel";

export function SortSelect() {
  const { params, update } = useBrowse();
  return (
    <Select
      aria-label="Sort by"
      value={params.sort ?? "recommended"}
      onChange={(e) => update({ sort: e.target.value === "recommended" ? undefined : (e.target.value as BrowseSort) })}
      className="h-9 w-auto min-w-0 text-[13px]"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}

export function ActiveFilters({ categories, locations }: { categories: Category[]; locations: Location[] }) {
  const { params: p, update, reset } = useBrowse();
  const chips: { key: string; label: string; clear: Partial<BrowseParams> }[] = [];
  if (p.kind) chips.push({ key: "kind", label: p.kind === "service" ? "Services" : "Products", clear: { kind: undefined } });
  if (p.category) chips.push({ key: "category", label: categories.find((c) => c.slug === p.category)?.name ?? p.category, clear: { category: undefined } });
  if (p.min !== undefined || p.max !== undefined) {
    const f = (n: number) => `₦${n.toLocaleString("en-NG")}`;
    const label = p.min !== undefined && p.max !== undefined ? `${f(p.min)} – ${f(p.max)}` : p.min !== undefined ? `From ${f(p.min)}` : `Up to ${f(p.max!)}`;
    chips.push({ key: "price", label, clear: { min: undefined, max: undefined } });
  }
  if (p.location) chips.push({ key: "location", label: locations.find((l) => l.slug === p.location)?.name ?? p.location, clear: { location: undefined } });
  if (p.rating) chips.push({ key: "rating", label: `${p.rating}★ & up`, clear: { rating: undefined } });
  if (p.inStock) chips.push({ key: "stock", label: "In stock", clear: { inStock: undefined } });
  if (p.seller) chips.push({ key: "seller", label: { verified: "Verified sellers", student: "Student sellers", business: "Campus businesses" }[p.seller], clear: { seller: undefined } });
  if (p.condition) chips.push({ key: "condition", label: { new: "New", like_new: "Like new", used: "Used" }[p.condition], clear: { condition: undefined } });
  if (p.fulfilment) chips.push({ key: "fulfilment", label: p.fulfilment === "delivery" ? "Delivery" : "Pickup", clear: { fulfilment: undefined } });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => update(c.clear)}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft pr-2 pl-2.5 text-xs text-accent hover:border-accent/60"
        >
          {c.label}
          <X size={12} strokeWidth={2} aria-label="Remove" />
        </button>
      ))}
      <button type="button" onClick={reset} className="ml-1 text-xs text-muted hover:text-ink">
        Clear all
      </button>
    </div>
  );
}

export function MobileFilters({ categories, locations, total, hideKind }: { categories: Category[]; locations: Location[]; total: number; hideKind?: boolean }) {
  const { params } = useBrowse();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(params);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
        Filters{count ? ` (${count})` : ""}
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <Button className="w-full" size="lg" onClick={() => setOpen(false)}>
            Show {total.toLocaleString("en-NG")} {total === 1 ? "result" : "results"}
          </Button>
        }
      >
        <FilterPanel categories={categories} locations={locations} hideKind={hideKind} />
      </BottomSheet>
    </>
  );
}
