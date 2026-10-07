import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { ProductCardData } from "@/lib/types";
import { BUSINESS_SELECT, toBusiness, type BusinessCardData } from "./businesses";
import { PRODUCT_CARD_SELECT, toCard } from "./catalog";

/** Ids of the viewer's saved products (one query per request), used to render save toggles. */
export const getSavedProductIds = cache(async (): Promise<Set<string>> => {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_products").select("product_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((r) => r.product_id as string));
});

export const getSavedBusinessIds = cache(async (): Promise<Set<string>> => {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_businesses").select("business_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((r) => r.business_id as string));
});

export type SavedProduct = ProductCardData & { price_at_save_kobo: number | null; status: "draft" | "active" | "paused" | "removed" | "gone" };

export async function getSaved(userId: string): Promise<{ products: SavedProduct[]; businesses: BusinessCardData[] }> {
  const supabase = await createClient();
  const [{ data: sp }, { data: sb }] = await Promise.all([
    supabase.from("saved_products").select("product_id, price_at_save_kobo, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("saved_businesses").select("business_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const productIds = (sp ?? []).map((r) => r.product_id as string);
  const businessIds = (sb ?? []).map((r) => r.business_id as string);
  const [{ data: products }, { data: businesses }] = await Promise.all([
    productIds.length
      ? supabase.from("products").select(`${PRODUCT_CARD_SELECT}, status`).in("id", productIds)
      : Promise.resolve({ data: [] }),
    businessIds.length
      ? supabase.from("businesses").select(BUSINESS_SELECT).in("id", businessIds).eq("products.status", "active")
      : Promise.resolve({ data: [] }),
  ]);
  type P = Parameters<typeof toCard>[0] & { status: SavedProduct["status"] };
  const byId = new Map(((products ?? []) as unknown as P[]).map((p) => [p.id, p]));
  const bizById = new Map(((businesses ?? []) as unknown as Parameters<typeof toBusiness>[0][]).map((b) => [b.id, toBusiness(b)]));
  return {
    products: (sp ?? []).flatMap((r) => {
      const p = byId.get(r.product_id as string);
      return p ? [{ ...toCard(p), status: p.status, price_at_save_kobo: r.price_at_save_kobo as number | null }] : [];
    }),
    businesses: businessIds.map((id) => bizById.get(id)).filter((b): b is BusinessCardData => !!b),
  };
}
