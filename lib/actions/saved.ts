"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ToggleResult = { ok: boolean; saved: boolean; requiresAuth?: boolean };
const id = z.uuid();

export async function toggleSavedProduct(productId: string): Promise<ToggleResult> {
  if (!id.safeParse(productId).success) return { ok: false, saved: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, saved: false, requiresAuth: true };

  const { data: existing } = await supabase.from("saved_products").select("product_id").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("saved_products").delete().eq("user_id", user.id).eq("product_id", productId);
    revalidatePath("/saved");
    return { ok: !error, saved: !!error };
  }
  const { data: product } = await supabase.from("products").select("price_kobo").eq("id", productId).maybeSingle();
  if (!product) return { ok: false, saved: false };
  const { error } = await supabase.from("saved_products").insert({ user_id: user.id, product_id: productId, price_at_save_kobo: product.price_kobo });
  revalidatePath("/saved");
  return { ok: !error, saved: !error };
}

export async function toggleSavedBusiness(businessId: string): Promise<ToggleResult> {
  if (!id.safeParse(businessId).success) return { ok: false, saved: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, saved: false, requiresAuth: true };

  const { data: existing } = await supabase.from("saved_businesses").select("business_id").eq("user_id", user.id).eq("business_id", businessId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("saved_businesses").delete().eq("user_id", user.id).eq("business_id", businessId);
    revalidatePath("/saved");
    return { ok: !error, saved: !!error };
  }
  const { error } = await supabase.from("saved_businesses").insert({ user_id: user.id, business_id: businessId });
  revalidatePath("/saved");
  return { ok: !error, saved: !error };
}

const prefsSchema = z.object({
  notify_price_drop: z.boolean(),
  notify_back_in_stock: z.boolean(),
  notify_new_listings: z.boolean(),
});

export async function updateNotificationPrefs(prefs: z.input<typeof prefsSchema>): Promise<{ ok: boolean }> {
  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  revalidatePath("/saved");
  revalidatePath("/account");
  return { ok: !error };
}
