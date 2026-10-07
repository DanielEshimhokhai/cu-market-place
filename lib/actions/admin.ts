"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { slugify } from "@/lib/slug";

const id = z.uuid();
const fail = (error = "Couldn't complete that action."): ActionResult => ({ ok: false, error });

/** Every admin action re-checks the role on the server; RLS admin policies are the second gate. */
async function adminClient() {
  const admin = await requireAdmin();
  return { admin, supabase: await createClient() };
}

async function notify(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, title: string, body: string, href: string | null) {
  await supabase.from("notifications").insert({ user_id: userId, type: "moderation", title, body, href });
}

export async function resolveReport(reportId: string, status: "reviewing" | "resolved" | "dismissed", note?: string): Promise<ActionResult> {
  if (!id.safeParse(reportId).success) return fail();
  const { admin, supabase } = await adminClient();
  const { error } = await supabase
    .from("reports")
    .update({
      status,
      resolution_note: note?.trim().slice(0, 500) || null,
      resolved_by: status === "reviewing" ? null : admin.id,
      resolved_at: status === "reviewing" ? null : new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return fail();
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "reviewing" ? "Marked as reviewing" : status === "resolved" ? "Report resolved" : "Report dismissed" };
}

export async function setListingStatus(productId: string, status: "active" | "removed", reason?: string): Promise<ActionResult> {
  if (!id.safeParse(productId).success) return fail();
  const { supabase } = await adminClient();
  const { data, error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId)
    .select("title, slug, business:businesses(owner_id)")
    .single();
  if (error || !data) return fail();
  const owner = (data.business as unknown as { owner_id: string } | null)?.owner_id;
  if (owner) {
    await notify(
      supabase,
      owner,
      status === "removed" ? `Listing removed: ${data.title}` : `Listing restored: ${data.title}`,
      status === "removed" ? reason?.trim() || "It broke the marketplace rules. Reply to the moderators if you think this is a mistake." : "It's visible to buyers again.",
      "/sell/products",
    );
  }
  revalidatePath("/admin", "layout");
  revalidatePath(`/p/${data.slug}`);
  revalidatePath("/browse");
  return { ok: true, message: status === "removed" ? "Listing removed" : "Listing restored" };
}

export async function setBusinessVerified(businessId: string, verified: boolean): Promise<ActionResult> {
  if (!id.safeParse(businessId).success) return fail();
  const { supabase } = await adminClient();
  const { data, error } = await supabase.from("businesses").update({ verified }).eq("id", businessId).select("slug, owner_id").single();
  if (error || !data) return fail();
  if (verified) await notify(supabase, data.owner_id, "Your store is verified", "Buyers now see the Covenant Verified mark on your store.", `/b/${data.slug}`);
  revalidatePath("/admin", "layout");
  revalidatePath(`/b/${data.slug}`);
  return { ok: true, message: verified ? "Seller verified" : "Verification removed" };
}

export async function setBusinessStatus(businessId: string, status: "active" | "suspended", reason?: string): Promise<ActionResult> {
  if (!id.safeParse(businessId).success) return fail();
  const { supabase } = await adminClient();
  const { data, error } = await supabase.from("businesses").update({ status }).eq("id", businessId).select("slug, owner_id").single();
  if (error || !data) return fail();
  await notify(
    supabase,
    data.owner_id,
    status === "suspended" ? "Your store has been suspended" : "Your store is active again",
    status === "suspended" ? reason?.trim() || "Moderators suspended your store after a report. It's hidden from buyers for now." : "Buyers can see your listings again.",
    "/sell",
  );
  revalidatePath("/", "layout");
  return { ok: true, message: status === "suspended" ? "Store suspended" : "Store reactivated" };
}

export async function setUserRole(userId: string, role: "student" | "staff" | "admin"): Promise<ActionResult> {
  if (!id.safeParse(userId).success || !["student", "staff", "admin"].includes(role)) return fail();
  const { admin, supabase } = await adminClient();
  if (userId === admin.id && role !== "admin") return fail("You can't remove your own admin role.");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return fail();
  revalidatePath("/admin/users");
  return { ok: true, message: "Role updated" };
}

export async function setReviewHidden(reviewId: string, hidden: boolean): Promise<ActionResult> {
  if (!id.safeParse(reviewId).success) return fail();
  const { supabase } = await adminClient();
  const { error } = await supabase.from("reviews").update({ is_hidden: hidden }).eq("id", reviewId);
  if (error) return fail();
  revalidatePath("/admin", "layout");
  return { ok: true, message: hidden ? "Review hidden" : "Review visible again" };
}

const categorySchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().min(2, "Name it").max(40),
  kind: z.enum(["product", "service"]),
  sort: z.coerce.number().int().min(0).max(999),
});

export async function saveCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await adminClient();
  const { id: catId, ...fields } = parsed.data;
  const { error } = catId
    ? await supabase.from("categories").update(fields).eq("id", catId)
    : await supabase.from("categories").insert({ ...fields, slug: slugify(fields.name) });
  if (error) return fail(error.code === "23505" ? "A category with that name already exists." : undefined);
  revalidateTag("categories", "max");
  revalidatePath("/", "layout");
  return { ok: true, message: catId ? "Category saved" : "Category added" };
}

export async function toggleCategory(categoryId: string, active: boolean): Promise<ActionResult> {
  if (!id.safeParse(categoryId).success) return fail();
  const { supabase } = await adminClient();
  const { error } = await supabase.from("categories").update({ is_active: active }).eq("id", categoryId);
  if (error) return fail();
  revalidateTag("categories", "max");
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Category shown" : "Category hidden" };
}
