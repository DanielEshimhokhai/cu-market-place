"use server";

import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";
import { reportSchema } from "@/lib/validation/report";

const HOURLY_LIMIT = 5;

export async function submitReport(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to report a problem." };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) return { ok: false, error: "You've sent several reports in the last hour. Please try again later." };

  const { error } = await supabase.from("reports").insert({ ...parsed.data, details: parsed.data.details || null, reporter_id: user.id });
  if (error) return { ok: false, error: "Couldn't send your report. Try again." };
  return { ok: true };
}
