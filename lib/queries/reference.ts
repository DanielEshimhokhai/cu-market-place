import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import type { Category, Location } from "@/lib/types";

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await createPublicClient().from("categories").select("id, slug, name, kind, sort").order("sort");
    if (error) throw error;
    return data;
  },
  ["categories"],
  { revalidate: 3600, tags: ["categories"] },
);

export const getLocations = unstable_cache(
  async (): Promise<Location[]> => {
    const { data, error } = await createPublicClient().from("locations").select("id, slug, name, zone, map_x, map_y").order("sort");
    if (error) throw error;
    return data;
  },
  ["locations"],
  { revalidate: 3600, tags: ["locations"] },
);

export const ZONE_LABEL: Record<Location["zone"], string> = {
  hostels: "Halls of residence",
  central: "Central campus",
  academic: "Academic area",
  other: "Other",
};
