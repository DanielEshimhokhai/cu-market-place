import type { Condition, ListingKind } from "./types";
import { normalizeQuery } from "./search";

export type BrowseSort = "recommended" | "newest" | "price_asc" | "price_desc" | "rating";
export type BrowseParams = {
  q?: string;
  category?: string;
  kind?: ListingKind;
  min?: number;
  max?: number;
  location?: string;
  rating?: number;
  inStock?: boolean;
  seller?: "student" | "business" | "verified";
  condition?: Condition;
  fulfilment?: "pickup" | "delivery";
  sort?: BrowseSort;
  page?: number;
};

export const SORT_OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest rated" },
];

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed as readonly string[]).includes(v ?? "") ? (v as T) : undefined;
const slug = (v: string | undefined) => (v && /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined);
const naira = (v: string | undefined) => {
  if (!v || !/^\d{1,9}$/.test(v)) return undefined;
  return Number(v);
};

export function parseBrowseParams(raw: Raw): BrowseParams {
  const p: BrowseParams = {};
  const q = normalizeQuery(first(raw.q));
  if (q) p.q = q;
  const category = slug(first(raw.category));
  if (category) p.category = category;
  const kind = oneOf(first(raw.kind), ["product", "service"] as const);
  if (kind) p.kind = kind;
  let min = naira(first(raw.min));
  let max = naira(first(raw.max));
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  if (min !== undefined) p.min = min;
  if (max !== undefined) p.max = max;
  const location = slug(first(raw.location));
  if (location) p.location = location;
  const rating = Number(first(raw.rating));
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) p.rating = rating;
  if (first(raw.inStock) === "1") p.inStock = true;
  const seller = oneOf(first(raw.seller), ["student", "business", "verified"] as const);
  if (seller) p.seller = seller;
  const condition = oneOf(first(raw.condition), ["new", "like_new", "used"] as const);
  if (condition) p.condition = condition;
  const fulfilment = oneOf(first(raw.fulfilment), ["pickup", "delivery"] as const);
  if (fulfilment) p.fulfilment = fulfilment;
  const sort = oneOf(first(raw.sort), ["newest", "price_asc", "price_desc", "rating"] as const);
  if (sort) p.sort = sort;
  const page = Number(first(raw.page));
  if (Number.isInteger(page) && page > 1 && page <= 50) p.page = page;
  return p;
}

export function toSearchParams(p: BrowseParams): URLSearchParams {
  const s = new URLSearchParams();
  if (p.q) s.set("q", p.q);
  if (p.category) s.set("category", p.category);
  if (p.kind) s.set("kind", p.kind);
  if (p.min !== undefined) s.set("min", String(p.min));
  if (p.max !== undefined) s.set("max", String(p.max));
  if (p.location) s.set("location", p.location);
  if (p.rating) s.set("rating", String(p.rating));
  if (p.inStock) s.set("inStock", "1");
  if (p.seller) s.set("seller", p.seller);
  if (p.condition) s.set("condition", p.condition);
  if (p.fulfilment) s.set("fulfilment", p.fulfilment);
  if (p.sort && p.sort !== "recommended") s.set("sort", p.sort);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  return s;
}

export function activeFilterCount(p: BrowseParams): number {
  return [p.category, p.kind, p.min ?? p.max, p.location, p.rating, p.inStock, p.seller, p.condition, p.fulfilment].filter(
    (v) => v !== undefined && v !== false,
  ).length;
}
