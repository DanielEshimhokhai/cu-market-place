import "server-only";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { normalizeQuery } from "@/lib/search";
import type { Condition, ListingKind, ProductCardData } from "@/lib/types";
import { getCategories, getLocations } from "./reference";

export const PRODUCT_CARD_SELECT =
  "id, slug, title, kind, price_kobo, compare_at_kobo, stock, condition, rating_avg, rating_count, created_at, " +
  "images:product_images(path, position), " +
  "business:businesses!inner(id, slug, name, verified, status, seller_type), " +
  "location:locations(slug, name)";

type Row = {
  id: string; slug: string; title: string; kind: ListingKind; price_kobo: number; compare_at_kobo: number | null;
  stock: number | null; condition: Condition; rating_avg: number | string; rating_count: number;
  images: { path: string; position: number }[] | null;
  business: { id: string; slug: string; name: string; verified: boolean };
  location: { slug: string; name: string } | null;
};

export function toCard(row: Row): ProductCardData {
  const first = [...(row.images ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: row.id, slug: row.slug, title: row.title, kind: row.kind, price_kobo: row.price_kobo,
    compare_at_kobo: row.compare_at_kobo, stock: row.stock, condition: row.condition,
    rating_avg: Number(row.rating_avg), rating_count: row.rating_count, image: imageUrl(first?.path),
    business: { id: row.business.id, slug: row.business.slug, name: row.business.name, verified: row.business.verified },
    location: row.location,
  };
}

export const PAGE_SIZE = 24;
export type BrowseSort = "recommended" | "newest" | "price_asc" | "price_desc" | "rating";
export type BrowseParams = {
  q?: string; category?: string; kind?: ListingKind; min?: number; max?: number; location?: string; rating?: number;
  inStock?: boolean; seller?: "student" | "business" | "verified"; condition?: Condition; fulfilment?: "pickup" | "delivery";
  sort?: BrowseSort; page?: number;
};

export async function browseProducts(p: BrowseParams): Promise<{ items: ProductCardData[]; total: number; pageSize: number }> {
  const supabase = await createClient();
  const [categories, locations] = await Promise.all([getCategories(), getLocations()]);
  let query = supabase
    .rpc("search_products", { p_q: normalizeQuery(p.q) }, { count: "exact" })
    .select(PRODUCT_CARD_SELECT)
    .eq("status", "active")
    .eq("business.status", "active");

  if (p.category) {
    const cat = categories.find((c) => c.slug === p.category);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (p.kind) query = query.eq("kind", p.kind);
  if (p.min !== undefined) query = query.gte("price_kobo", p.min * 100);
  if (p.max !== undefined) query = query.lte("price_kobo", p.max * 100);
  if (p.location) {
    const loc = locations.find((l) => l.slug === p.location);
    if (loc) query = query.eq("pickup_location_id", loc.id);
  }
  if (p.rating) query = query.gte("rating_avg", p.rating);
  if (p.inStock) query = query.or("stock.is.null,stock.gt.0");
  if (p.seller === "verified") query = query.eq("business.verified", true);
  else if (p.seller) query = query.eq("business.seller_type", p.seller);
  if (p.condition) query = query.eq("condition", p.condition);
  if (p.fulfilment === "delivery") query = query.eq("allows_delivery", true);
  if (p.fulfilment === "pickup") query = query.eq("allows_pickup", true);

  switch (p.sort) {
    case "newest": query = query.order("created_at", { ascending: false }); break;
    case "price_asc": query = query.order("price_kobo", { ascending: true }); break;
    case "price_desc": query = query.order("price_kobo", { ascending: false }); break;
    case "rating": query = query.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }); break;
    default: break; // search_products already orders by relevance, then popularity.
  }

  const page = Math.max(1, p.page ?? 1);
  // "Load more" renders every page up to the current one.
  const { data, count, error } = await query.range(0, page * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data as unknown as Row[]).map(toCard), total: count ?? 0, pageSize: PAGE_SIZE };
}

async function listCards(build: (q: ReturnType<typeof base>) => ReturnType<typeof base>, limit: number) {
  const { data, error } = await build(base(await createClient())).limit(limit);
  if (error) throw error;
  return (data as unknown as Row[]).map(toCard);
}
function base(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("products").select(PRODUCT_CARD_SELECT).eq("status", "active").eq("business.status", "active");
}

export const getTrending = (limit = 12) =>
  listCards((q) => q.eq("kind", "product").or("stock.is.null,stock.gt.0").order("score", { ascending: false }), limit);

export const getRecentlyListed = (limit = 12) => listCards((q) => q.order("created_at", { ascending: false }), limit);

export const getPopularServices = (limit = 8) =>
  listCards((q) => q.eq("kind", "service").order("score", { ascending: false }), limit);

export async function getProductsByIds(ids: string[]): Promise<ProductCardData[]> {
  if (!ids.length) return [];
  const cards = await listCards((q) => q.in("id", ids.slice(0, 24)), 24);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is ProductCardData => !!c);
}
