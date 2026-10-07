"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocations } from "@/lib/queries/reference";

const COOKIE = "cu_loc";

export async function getLocationPref(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value ?? null;
  if (!value) return null;
  const locations = await getLocations();
  return locations.some((l) => l.slug === value) ? value : null;
}

export async function setLocationPref(slug: string | null): Promise<void> {
  const store = await cookies();
  if (!slug) store.delete(COOKIE);
  else if ((await getLocations()).some((l) => l.slug === slug)) {
    store.set(COOKIE, slug, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  }
  revalidatePath("/");
}
