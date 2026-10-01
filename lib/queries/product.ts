import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { shortName } from "@/lib/names";
import type { Category, Condition, ListingKind, ProductCardData, ProductStatus } from "@/lib/types";
import { BUSINESS_SELECT, toBusiness, type BusinessCardData } from "./businesses";
import { PRODUCT_CARD_SELECT, toCard } from "./catalog";

export type Variant = { id: string; name: string; value: string; stock: number | null; price_delta_kobo: number };

export type ProductDetail = {
  id: string; slug: string; title: string; kind: ListingKind; description: string; price_kobo: number;
  compare_at_kobo: number | null; condition: Condition; stock: number | null; status: ProductStatus;
  allows_pickup: boolean; allows_delivery: boolean; delivery_note: string | null; created_at: string;
  rating_avg: number; rating_count: number; category: Pick<Category, "id" | "slug" | "name"> | null;
  location: { slug: string; name: string } | null; images: string[]; variants: Variant[];
  business: BusinessCardData & { owner_id: string; delivery_note: string | null; description: string | null };
};

export type ReviewView = {
  id: string; rating: number; body: string | null; created_at: string; author: string;
  quality: number | null; communication: number | null; accuracy: number | null; fulfilment_rating: number | null;
  productTitle?: string; productSlug?: string;
};

export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, kind, description, price_kobo, compare_at_kobo, condition, stock, status, allows_pickup, allows_delivery, " +
        "delivery_note, created_at, rating_avg, rating_count, category:categories(id, slug, name), location:locations(slug, name), " +
        "images:product_images(path, position), variants:product_variants(id, name, value, stock, price_delta_kobo, position), " +
        `business:businesses!inner(owner_id, delivery_note, description, ${BUSINESS_SELECT})`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type Row = Omit<ProductDetail, "images" | "variants" | "business" | "rating_avg"> & {
    rating_avg: number | string;
    images: { path: string; position: number }[];
    variants: (Variant & { position: number })[];
    business: Parameters<typeof toBusiness>[0] & { owner_id: string; delivery_note: string | null; description: string | null };
  };
  const row = data as unknown as Row;
  return {
    ...row,
    rating_avg: Number(row.rating_avg),
    images: [...row.images].sort((a, b) => a.position - b.position).map((i) => imageUrl(i.path)!).filter(Boolean),
    variants: [...row.variants].sort((a, b) => a.position - b.position),
    business: {
      ...toBusiness(row.business),
      owner_id: row.business.owner_id,
      delivery_note: row.business.delivery_note,
      description: row.business.description,
    },
  };
});

const REVIEW_SELECT =
  "id, rating, body, created_at, quality, communication, accuracy, fulfilment_rating, author:public_profiles!reviews_author_id_fkey(full_name), product:products(title, slug)";

type ReviewRow = Omit<ReviewView, "author" | "productTitle" | "productSlug"> & {
  author: { full_name: string } | null;
  product: { title: string; slug: string } | null;
};
const toReview = (r: ReviewRow): ReviewView => ({
  ...r,
  author: shortName(r.author?.full_name ?? ""),
  productTitle: r.product?.title,
  productSlug: r.product?.slug,
});

async function fetchReviews(column: "product_id" | "business_id", id: string, limit: number): Promise<ReviewView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq(column, id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as ReviewRow[]).map(toReview);
}

export const getProductReviews = (productId: string, limit = 6) => fetchReviews("product_id", productId, limit);
export const getBusinessReviews = (businessId: string, limit = 30) => fetchReviews("business_id", businessId, limit);

export type RatingSummary = {
  avg: number; count: number; breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  aspects: { label: string; avg: number }[];
};

export async function getRatingSummary(column: "product_id" | "business_id", id: string): Promise<RatingSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("rating, quality, communication, accuracy, fulfilment_rating")
    .eq(column, id)
    .eq("is_hidden", false);
  const rows = data ?? [];
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["breakdown"];
  rows.forEach((r) => (breakdown[r.rating as 1 | 2 | 3 | 4 | 5] += 1));
  const avgOf = (k: "quality" | "communication" | "accuracy" | "fulfilment_rating") => {
    const vals = rows.map((r) => r[k]).filter((v): v is number => typeof v === "number");
    return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const aspects: { label: string; avg: number }[] = [];
  for (const [label, k] of [["Product quality", "quality"], ["Communication", "communication"], ["Accuracy", "accuracy"], ["Fulfilment", "fulfilment_rating"]] as const) {
    const avg = avgOf(k);
    if (avg !== null) aspects.push({ label, avg });
  }
  return {
    avg: rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0,
    count: rows.length,
    breakdown,
    aspects,
  };
}

export async function getSimilar(product: ProductDetail, limit = 10): Promise<ProductCardData[]> {
  if (!product.category) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("status", "active")
    .eq("business.status", "active")
    .eq("category_id", product.category.id)
    .neq("id", product.id)
    .order("score", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as Parameters<typeof toCard>[0][]).map(toCard);
}

export async function getResponseStats(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("business_response_stats", { p_business_id: businessId }).maybeSingle();
  const stats = data as { conversations: number; response_rate: number | null; avg_response_minutes: number | null } | null;
  return stats && stats.conversations >= 3 ? stats : null;
}
