import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/images";
import { openStatus, type OpeningHours } from "@/lib/hours";
import { escapeLike, normalizeQuery } from "@/lib/search";
import type { BusinessSummary } from "@/lib/types";
import { getCategories, getLocations } from "./reference";

export const BUSINESS_SELECT =
  "id, slug, name, tagline, verified, seller_type, rating_avg, rating_count, hours, logo_url, offers_delivery, created_at, " +
  "category:categories(slug, name), location:locations(slug, name, map_x, map_y), products(count)";

type Row = Omit<BusinessSummary, "product_count" | "rating_avg" | "location"> & {
  rating_avg: number | string;
  created_at: string;
  location: { slug: string; name: string; map_x: number; map_y: number } | null;
  products: { count: number }[] | null;
};

export type BusinessCardData = BusinessSummary & { created_at: string; mapPoint: { x: number; y: number } | null };

export function toBusiness(row: Row): BusinessCardData {
  return {
    ...row,
    rating_avg: Number(row.rating_avg),
    logo_url: mediaUrl(row.logo_url),
    hours: (row.hours ?? null) as OpeningHours | null,
    location: row.location ? { slug: row.location.slug, name: row.location.name } : null,
    mapPoint: row.location ? { x: row.location.map_x, y: row.location.map_y } : null,
    product_count: row.products?.[0]?.count ?? 0,
  };
}

export type BusinessSort = "popular" | "rating" | "new" | "near";

export async function listBusinesses(opts: {
  category?: string; location?: string; q?: string; sort?: BusinessSort; near?: string | null; openNow?: boolean; limit?: number;
} = {}): Promise<BusinessCardData[]> {
  const supabase = await createClient();
  const [categories, locations] = await Promise.all([getCategories(), getLocations()]);
  let query = supabase.from("businesses").select(BUSINESS_SELECT).eq("status", "active").eq("products.status", "active");
  if (opts.category) {
    const cat = categories.find((c) => c.slug === opts.category);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (opts.location) {
    const loc = locations.find((l) => l.slug === opts.location);
    if (loc) query = query.eq("location_id", loc.id);
  }
  const q = normalizeQuery(opts.q);
  if (q) query = query.or(`name.ilike.%${escapeLike(q).replace(/[,()]/g, " ")}%,tagline.ilike.%${escapeLike(q).replace(/[,()]/g, " ")}%`);
  if (opts.sort === "new") query = query.order("created_at", { ascending: false });
  else if (opts.sort === "rating") query = query.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
  else query = query.order("rating_count", { ascending: false });

  const { data, error } = await query.limit(200);
  if (error) throw error;
  let list = (data as unknown as Row[]).map(toBusiness);
  if (opts.openNow) list = list.filter((b) => openStatus(b.hours).open);
  if (opts.sort === "near" && opts.near) list = sortByDistance(list, locations.find((l) => l.slug === opts.near));
  return opts.limit ? list.slice(0, opts.limit) : list;
}

function sortByDistance(list: BusinessCardData[], from: { map_x: number; map_y: number } | undefined) {
  if (!from) return list;
  const d = (b: BusinessCardData) => (b.mapPoint ? Math.hypot(b.mapPoint.x - from.map_x, b.mapPoint.y - from.map_y) : 999);
  return [...list].sort((a, b) => d(a) - d(b) || b.rating_count - a.rating_count);
}

/** Businesses closest to a campus location; popular ones when no location is set. */
export function getBusinessesNear(locationSlug: string | null, limit = 8) {
  return listBusinesses(locationSlug ? { sort: "near", near: locationSlug, limit } : { sort: "popular", limit });
}

export const getNewBusinesses = async (limit = 8) => {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return (await listBusinesses({ sort: "new" })).filter((b) => new Date(b.created_at).getTime() > since).slice(0, limit);
};
