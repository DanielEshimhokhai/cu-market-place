"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";
import { reviewSchema } from "@/lib/validation/review";

export async function submitReview(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to leave a review." };

  // business_id is filled in by the database from the order; the trigger also checks the order is completed and yours.
  const { data: order } = await supabase.from("orders").select("business_id, business:businesses(slug)").eq("id", parsed.data.order_id).maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  const { error } = await supabase.from("reviews").insert({ ...parsed.data, business_id: order.business_id, author_id: user.id });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already reviewed this item." };
    if (/REVIEW_NOT_ALLOWED/.test(error.message)) return { ok: false, error: "You can review an order once it's completed." };
    return { ok: false, error: "Couldn't save your review. Try again." };
  }
  const { data: product } = await supabase.from("products").select("slug").eq("id", parsed.data.product_id).maybeSingle();
  revalidatePath(`/orders/${parsed.data.order_id}`);
  revalidatePath(`/orders/${parsed.data.order_id}/review`);
  revalidatePath("/orders");
  if (product?.slug) revalidatePath(`/p/${product.slug}`);
  const slug = (order.business as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/b/${slug}`);
  return { ok: true, message: "Thanks for your review." };
}
