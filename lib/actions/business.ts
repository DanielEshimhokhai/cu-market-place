"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";
import { slugify, withSuffix } from "@/lib/slug";
import { businessSchema } from "@/lib/validation/business";

export type BusinessFormResult = ActionResult & { values?: Record<string, string> };
const FIELDS = ["name", "tagline", "description", "category_id", "location_id", "seller_type", "offers_delivery", "delivery_note", "hours"];
const echo = (fd: FormData) => Object.fromEntries(FIELDS.map((k) => [k, String(fd.get(k) ?? "")]));
const randomSuffix = () => Math.random().toString(36).slice(2, 6);

export async function createBusiness(_prev: BusinessFormResult | null, formData: FormData): Promise<BusinessFormResult> {
  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...invalid(parsed.error), values: echo(formData) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/sell/onboarding");

  const { data: profile } = await supabase.from("profiles").select("cu_verified").eq("id", user.id).single();
  if (!profile?.cu_verified) return { ok: false, error: "Confirm your Covenant University email before opening a store.", values: echo(formData) };

  const base = slugify(parsed.data.name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : withSuffix(base, randomSuffix());
    const { error } = await supabase.from("businesses").insert({ ...parsed.data, owner_id: user.id, slug });
    if (!error) {
      revalidatePath("/", "layout");
      redirect("/sell?welcome=1");
    }
    if (error.code !== "23505") return { ok: false, error: "We couldn't create your store. Try again.", values: echo(formData) };
    if (/owner_id/.test(error.message)) redirect("/sell"); // already has a store
  }
  return { ok: false, error: "That name is taken. Try a slightly different one.", values: echo(formData) };
}

export async function updateBusiness(_prev: BusinessFormResult | null, formData: FormData): Promise<BusinessFormResult> {
  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...invalid(parsed.error), values: echo(formData) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to continue." };
  const { error } = await supabase.from("businesses").update(parsed.data).eq("owner_id", user.id);
  if (error) return { ok: false, error: "Couldn't save your changes. Try again.", values: echo(formData) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Store settings saved." };
}

/** Saves the path of a logo the browser already uploaded to business-media/{businessId}/… */
export async function setLogo(path: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to continue." };
  const { data: business } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return { ok: false, error: "Store not found." };
  if (path !== null && !z.string().regex(new RegExp(`^${business.id}/logo-[a-z0-9-]+\\.webp$`)).safeParse(path).success) {
    return { ok: false, error: "Invalid image." };
  }
  const { error } = await supabase.from("businesses").update({ logo_url: path }).eq("id", business.id);
  if (error) return { ok: false, error: "Couldn't save the logo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
