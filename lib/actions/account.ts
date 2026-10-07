"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(60),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || /^(\+234|0)[789][01]\d{8}$/.test(v), "Enter a Nigerian number, e.g. 08031234567")
    .transform((v) => v || null),
});

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to continue." };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: "Couldn't save. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved" };
}
