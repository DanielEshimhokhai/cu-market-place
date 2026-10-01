import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

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
