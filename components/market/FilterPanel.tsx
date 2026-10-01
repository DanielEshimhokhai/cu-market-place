"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { BrowseParams } from "@/lib/browse-params";
import type { Category, Location } from "@/lib/types";
import { useBrowse } from "./BrowseState";

const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₦5,000", max: 5000 },
  { label: "₦5k – ₦20k", min: 5000, max: 20000 },
  { label: "₦20k – ₦50k", min: 20000, max: 50000 },
  { label: "₦50k+", min: 50000 },
];
const ZONES: { zone: Location["zone"]; label: string }[] = [
  { zone: "hostels", label: "Halls" },
  { zone: "central", label: "Central campus" },
  { zone: "academic", label: "Academic area" },
  { zone: "other", label: "Other" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 float-left w-full text-[13px] font-semibold text-ink">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Radio<T extends string | number | undefined>({ name, value, current, label, onPick }: {
  name: string; value: T; current: T; label: string; onPick: (v: T) => void;
}) {
  return <Checkbox type="radio" name={name} checked={current === value} onChange={() => onPick(value)} label={label} />;
}

export function FilterPanel({ categories, locations, hideKind = false }: { categories: Category[]; locations: Location[]; hideKind?: boolean }) {
  const { params: p, update } = useBrowse();
  const [showAllCats, setShowAllCats] = useState(false);
  const [min, setMin] = useState(p.min?.toString() ?? "");
  const [max, setMax] = useState(p.max?.toString() ?? "");
  useEffect(() => {
    setMin(p.min?.toString() ?? "");
    setMax(p.max?.toString() ?? "");
  }, [p.min, p.max]);

  const visibleCats = showAllCats ? categories : categories.slice(0, 8);
  const applyPrice = () => {
    const toNum = (v: string) => (/^\d+$/.test(v.replace(/[,\s₦]/g, "")) ? Number(v.replace(/[,\s₦]/g, "")) : undefined);
    update({ min: toNum(min), max: toNum(max) });
  };
  const set = <K extends keyof BrowseParams>(key: K) => (v: BrowseParams[K]) => update({ [key]: v } as Partial<BrowseParams>);

  return (
    <div className="text-sm">
      {!hideKind && (
        <Group title="Type">
          <Radio name="kind" value={undefined} current={p.kind} label="Everything" onPick={set("kind")} />
          <Radio name="kind" value="product" current={p.kind} label="Products" onPick={set("kind")} />
          <Radio name="kind" value="service" current={p.kind} label="Services" onPick={set("kind")} />
        </Group>
      )}

      <Group title="Category">
        <Radio name="category" value={undefined} current={p.category} label="All categories" onPick={set("category")} />
        {visibleCats.map((c) => (
          <Radio key={c.slug} name="category" value={c.slug} current={p.category} label={c.name} onPick={set("category")} />
        ))}
        {categories.length > 8 && (
          <button type="button" onClick={() => setShowAllCats((s) => !s)} className="mt-1 text-[13px] text-muted hover:text-ink">
            {showAllCats ? "Show fewer" : `Show all ${categories.length}`}
          </button>
        )}
      </Group>

      <Group title="Price (₦)">
        <div className="flex items-center gap-2">
          <Input aria-label="Minimum price" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === "Enter" && applyPrice()} className="h-9" />
          <span className="text-faint">–</span>
          <Input aria-label="Maximum price" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === "Enter" && applyPrice()} className="h-9" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((r) => {
            const active = p.min === r.min && p.max === r.max;
            return (
              <button
                key={r.label}
                type="button"
                aria-pressed={active}
                onClick={() => update(active ? { min: undefined, max: undefined } : { min: r.min, max: r.max })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors duration-150",
                  active ? "border-accent bg-accent-soft text-accent" : "border-line text-ink hover:bg-subtle",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Pickup location">
        <Select aria-label="Pickup location" value={p.location ?? ""} onChange={(e) => update({ location: e.target.value || undefined })} className="h-9">
          <option value="">Anywhere on campus</option>
          {ZONES.map(({ zone, label }) => (
            <optgroup key={zone} label={label}>
              {locations.filter((l) => l.zone === zone).map((l) => (
                <option key={l.slug} value={l.slug}>{l.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Group>

      <Group title="Rating">
        <Radio name="rating" value={undefined} current={p.rating} label="Any rating" onPick={set("rating")} />
        <Radio name="rating" value={4} current={p.rating} label="4★ & up" onPick={set("rating")} />
        <Radio name="rating" value={3} current={p.rating} label="3★ & up" onPick={set("rating")} />
      </Group>

      <Group title="Availability">
        <Checkbox checked={!!p.inStock} onChange={(e) => update({ inStock: e.target.checked || undefined })} label="In stock only" />
      </Group>

      <Group title="Seller">
        <Radio name="seller" value={undefined} current={p.seller} label="Any seller" onPick={set("seller")} />
        <Radio name="seller" value="verified" current={p.seller} label="Verified sellers" onPick={set("seller")} />
        <Radio name="seller" value="student" current={p.seller} label="Student sellers" onPick={set("seller")} />
        <Radio name="seller" value="business" current={p.seller} label="Campus businesses" onPick={set("seller")} />
      </Group>

      <Group title="Condition">
        <Radio name="condition" value={undefined} current={p.condition} label="Any" onPick={set("condition")} />
        <Radio name="condition" value="new" current={p.condition} label="New" onPick={set("condition")} />
        <Radio name="condition" value="like_new" current={p.condition} label="Like new" onPick={set("condition")} />
        <Radio name="condition" value="used" current={p.condition} label="Used" onPick={set("condition")} />
      </Group>

      <Group title="Getting it">
        <Radio name="fulfilment" value={undefined} current={p.fulfilment} label="Pickup or delivery" onPick={set("fulfilment")} />
        <Radio name="fulfilment" value="pickup" current={p.fulfilment} label="Pickup available" onPick={set("fulfilment")} />
        <Radio name="fulfilment" value="delivery" current={p.fulfilment} label="Delivery available" onPick={set("fulfilment")} />
      </Group>
    </div>
  );
}
