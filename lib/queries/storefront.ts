import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProductCardData } from "@/lib/types";
import { BUSINESS_SELECT, toBusiness, type BusinessCardData } from "./businesses";
import { PRODUCT_CARD_SELECT, toCard } from "./catalog";
import { getBusinessReviews, getRatingSummary, getResponseStats, type RatingSummary, type ReviewView } from "./product";

export type StorefrontBusiness = BusinessCardData & {
  description: string | null; delivery_note: string | null; owner_id: string; status: "active" | "suspended";
};

export type Storefront = {
  business: StorefrontBusiness;
  products: (ProductCardData & { categorySlug: string | null; categoryName: string | null; created_at: string })[];
  reviews: ReviewView[];
  summary: RatingSummary;
  stats: Awaited<ReturnType<typeof getResponseStats>>;
};

export const getStorefront = cache(async (slug: string): Promise<Storefront | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(`description, delivery_note, owner_id, status, ${BUSINESS_SELECT}`)
    .eq("slug", slug)
    .eq("products.status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type Row = Parameters<typeof toBusiness>[0] & { description: string | null; delivery_note: string | null; owner_id: string; status: "active" | "suspended" };
  const row = data as unknown as Row;
  const business: StorefrontBusiness = { ...toBusiness(row), description: row.description, delivery_note: row.delivery_note, owner_id: row.owner_id, status: row.status };

  const [{ data: productRows }, reviews, summary, stats] = await Promise.all([
    supabase
      .from("products")
      .select(`${PRODUCT_CARD_SELECT}, category:categories(slug, name)`)
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    getBusinessReviews(business.id),
    getRatingSummary("business_id", business.id),
    getResponseStats(business.id),
  ]);
  type P = Parameters<typeof toCard>[0] & { category: { slug: string; name: string } | null; created_at: string };
  const products = ((productRows ?? []) as unknown as P[]).map((p) => ({
    ...toCard(p),
    categorySlug: p.category?.slug ?? null,
    categoryName: p.category?.name ?? null,
    created_at: p.created_at,
  }));
  return { business, products, reviews, summary, stats };
});
