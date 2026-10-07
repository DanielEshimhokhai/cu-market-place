import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: "student" | "staff" | "admin";
  cuVerified: boolean;
  businessId: string | null;
  businessSlug: string | null;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase.from("profiles").select("full_name, role, cu_verified, email").eq("id", user.id).single(),
    supabase.from("businesses").select("id, slug").eq("owner_id", user.id).maybeSingle(),
  ]);
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    role: profile?.role ?? "student",
    cuVerified: profile?.cu_verified ?? false,
    businessId: business?.id ?? null,
    businessSlug: business?.slug ?? null,
  };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/auth/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return viewer;
}

export async function requireSeller(): Promise<Viewer & { businessId: string; businessSlug: string }> {
  const viewer = await requireViewer("/sell");
  if (!viewer.businessId || !viewer.businessSlug) redirect("/sell/onboarding");
  return viewer as Viewer & { businessId: string; businessSlug: string };
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") notFound();
  return viewer;
}
