"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";
import { slugify, withSuffix } from "@/lib/slug";
import { productSchema } from "@/lib/validation/product";

export type ProductFormResult = ActionResult & { values?: Record<string, string> };
const suffix = () => Math.random().toString(36).slice(2, 6);
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));

async function ownBusinessId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, businessId: null };
  const { data } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  return { supabase, businessId: (data?.id as string | undefined) ?? null };
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/sell", "layout");
  revalidatePath("/browse");
  revalidatePath("/");
  if (slug) revalidatePath(`/p/${slug}`);
}

export async function saveProduct(_prev: ProductFormResult | null, formData: FormData): Promise<ProductFormResult> {
  if (formData.get("images_busy") === "1") return { ok: false, error: "Wait for your photos to finish uploading.", values: echo(formData) };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...invalid(parsed.error), values: echo(formData) };
  const { supabase, businessId } = await ownBusinessId();
  if (!businessId) return { ok: false, error: "Open a store before adding listings." };
  const { images, variants, ...fields } = parsed.data;

  // Uploaded images must live in this business's folder; seeded/duplicated https URLs are kept as-is.
  if (images.some((p) => !p.startsWith("https://") && !p.startsWith(`${businessId}/`))) return { ok: false, error: "One of the photos is invalid. Re-upload it." };

  const allVariantStock = variants.length > 0 && variants.every((v) => v.stock !== null);
  const stock = fields.stock === null ? null : allVariantStock ? variants.reduce((n, v) => n + (v.stock ?? 0), 0) : fields.stock;
  const row = { ...fields, stock };

  const editingId = String(formData.get("id") ?? "");
  let productId: string;
  let slug: string;
  if (editingId) {
    const { data, error } = await supabase.from("products").update(row).eq("id", editingId).eq("business_id", businessId).select("id, slug").maybeSingle();
    if (error) return { ok: false, error: /LISTING_REMOVED/.test(error.message) ? "Moderators removed this listing, so it can't be edited." : "Couldn't save. Try again.", values: echo(formData) };
    if (!data) return { ok: false, error: "Listing not found." };
    productId = data.id;
    slug = data.slug;
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, business_id: businessId, slug: withSuffix(slugify(fields.title), suffix()) })
      .select("id, slug")
      .single();
    if (error || !data) return { ok: false, error: "Couldn't create the listing. Try again.", values: echo(formData) };
    productId = data.id;
    slug = data.slug;
  }

  // Images: replace in the submitted order.
  await supabase.from("product_images").delete().eq("product_id", productId);
  await supabase.from("product_images").insert(images.map((path, position) => ({ product_id: productId, path, position })));

  // Variants: upsert by (name, value) so ids (and carts that reference them) survive edits.
  if (variants.length) {
    await supabase.from("product_variants").upsert(
      variants.map((v, position) => ({ product_id: productId, ...v, position })),
      { onConflict: "product_id,name,value" },
    );
  }
  const { data: existing } = await supabase.from("product_variants").select("id, name, value").eq("product_id", productId);
  const keep = new Set(variants.map((v) => `${v.name}\u0000${v.value}`));
  const stale = (existing ?? []).filter((v) => !keep.has(`${v.name}\u0000${v.value}`)).map((v) => v.id);
  if (stale.length) await supabase.from("product_variants").delete().in("id", stale);

  revalidateCatalog(slug);
  redirect(`/sell/products?saved=${encodeURIComponent(fields.title)}`);
}

const idSchema = z.uuid();

export async function setProductStatus(id: string, status: "active" | "paused"): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid listing." };
  const { supabase, businessId } = await ownBusinessId();
  if (!businessId) return { ok: false, error: "Not allowed." };
  const { data, error } = await supabase.from("products").update({ status }).eq("id", id).eq("business_id", businessId).select("slug").maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't update the listing." };
  revalidateCatalog(data.slug);
  return { ok: true, message: status === "active" ? "Listing is live" : "Listing paused" };
}

export async function duplicateProduct(id: string): Promise<ActionResult & { id?: string }> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid listing." };
  const { supabase, businessId } = await ownBusinessId();
  if (!businessId) return { ok: false, error: "Not allowed." };
  const { data: src } = await supabase
    .from("products")
    .select("kind, title, description, category_id, price_kobo, compare_at_kobo, condition, stock, pickup_location_id, allows_pickup, allows_delivery, delivery_note, images:product_images(path, position), variants:product_variants(name, value, stock, price_delta_kobo, position)")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!src) return { ok: false, error: "Listing not found." };
  const { images, variants, ...fields } = src as typeof src & { images: { path: string; position: number }[]; variants: Record<string, unknown>[] };
  const title = `${fields.title} (copy)`.slice(0, 90);
  const { data: copy, error } = await supabase
    .from("products")
    .insert({ ...fields, title, status: "draft", business_id: businessId, slug: withSuffix(slugify(title), suffix()) })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: "Couldn't duplicate the listing." };
  if (images.length) await supabase.from("product_images").insert(images.map((i) => ({ product_id: copy.id, path: i.path, position: i.position })));
  if (variants.length) await supabase.from("product_variants").insert(variants.map((v) => ({ ...v, product_id: copy.id })));
  revalidatePath("/sell/products");
  return { ok: true, id: copy.id, message: "Duplicated as a draft" };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid listing." };
  const { supabase, businessId } = await ownBusinessId();
  if (!businessId) return { ok: false, error: "Not allowed." };
  const { data: images } = await supabase.from("product_images").select("path").eq("product_id", id);
  const { data: deleted, error } = await supabase.from("products").delete().eq("id", id).eq("business_id", businessId).select("slug").maybeSingle();
  if (error || !deleted) return { ok: false, error: "Couldn't delete the listing." };

  // Remove this store's uploaded files that no other listing (e.g. a duplicate) still uses.
  const own = (images ?? []).map((i) => i.path as string).filter((p) => p.startsWith(`${businessId}/`));
  if (own.length) {
    const { data: stillUsed } = await supabase.from("product_images").select("path").in("path", own);
    const used = new Set((stillUsed ?? []).map((r) => r.path as string));
    const orphans = own.filter((p) => !used.has(p));
    if (orphans.length) await supabase.storage.from("product-images").remove(orphans);
  }
  revalidateCatalog(deleted.slug);
  return { ok: true, message: "Listing deleted" };
}
