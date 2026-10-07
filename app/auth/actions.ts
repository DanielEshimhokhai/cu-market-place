"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invalid, type ActionResult } from "@/lib/actions/result";
import { safeNext } from "@/lib/redirects";
import { passwordSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type AuthResult = ActionResult & { unconfirmedEmail?: string; values?: Record<string, string> };

/** Echo non-secret fields back so the form keeps what the user typed. */
const echo = (formData: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
const SIGN_UP_FIELDS = ["full_name", "email", "affiliation", "phone"];

export async function signUp(_prev: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...invalid(parsed.error), values: echo(formData, SIGN_UP_FIELDS) };
  const { full_name, email, affiliation, password, phone } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/`,
      data: { full_name, affiliation, phone: phone ?? "" },
    },
  });
  // Don't reveal whether an account exists: "already registered" goes to the same page.
  if (error && !/already registered/i.test(error.message)) {
    if (/rate limit/i.test(error.message)) {
      return { ok: false, error: "Too many sign-up emails were sent recently. Please try again in a few minutes.", values: echo(formData, SIGN_UP_FIELDS) };
    }
    return { ok: false, error: "We couldn't create your account. Please try again.", values: echo(formData, SIGN_UP_FIELDS) };
  }
  redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
}

export async function signIn(_prev: AuthResult | null, formData: FormData): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...invalid(parsed.error), values: echo(formData, ["email"]) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      return { ok: false, error: `Confirm your email first. We sent a link to ${parsed.data.email}.`, unconfirmedEmail: parsed.data.email, values: echo(formData, ["email"]) };
    }
    return { ok: false, error: "Email or password is incorrect.", values: echo(formData, ["email"]) };
  }
  redirect(safeNext(String(formData.get("next") ?? ""), "/"));
}

export async function resendConfirmation(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/` },
  });
  if (error) return { ok: false, error: /rate limit/i.test(error.message) ? "Please wait a minute before requesting another email." : "We couldn't resend the email." };
  return { ok: true, message: "Sent. Check your inbox and spam folder." };
}

export async function requestReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/auth/update-password`,
  });
  // Same response whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, we've sent a reset link." };
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, fieldErrors: { password: parsed.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { ok: false, error: "Your reset link has expired. Request a new one." };
  redirect("/account?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
