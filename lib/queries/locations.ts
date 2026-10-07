import "server-only";
import type { Location } from "@/lib/types";
import { listBusinesses } from "./businesses";
import { getLocations } from "./reference";

export async function getLocationsWithCounts(): Promise<(Location & { businessCount: number })[]> {
  const [locations, businesses] = await Promise.all([getLocations(), listBusinesses()]);
  const counts = new Map<string, number>();
  businesses.forEach((b) => b.location && counts.set(b.location.slug, (counts.get(b.location.slug) ?? 0) + 1));
  return locations.map((l) => ({ ...l, businessCount: counts.get(l.slug) ?? 0 }));
}
