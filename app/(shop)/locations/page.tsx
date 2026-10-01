import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CampusMap } from "@/components/market/CampusMap";
import { getLocationsWithCounts } from "@/lib/queries/locations";
import { ZONE_LABEL } from "@/lib/queries/reference";
import type { Location } from "@/lib/types";

export const metadata: Metadata = { title: "Campus map" };

export default async function LocationsPage() {
  const locations = await getLocationsWithCounts();
  const zones: Location["zone"][] = ["hostels", "central", "academic", "other"];
  return (
    <>
      <div className="pt-6 md:pt-10">
        <h1 className="text-[22px] font-semibold tracking-tight">Where to find sellers</h1>
        <p className="mt-1 text-[15px] text-muted">Pickup spots around campus. Sellers only show a general area; exact details come after you order.</p>
      </div>
      <CampusMap locations={locations} className="mt-6 md:max-w-xl" />
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {zones.map((zone) => (
          <section key={zone}>
            <h2 className="mb-2 text-[13px] font-semibold text-ink">{ZONE_LABEL[zone]}</h2>
            <ul className="divide-y divide-line rounded-card border border-line bg-surface">
              {locations.filter((l) => l.zone === zone).map((l) => (
                <li key={l.slug}>
                  <Link href={`/locations/${l.slug}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-subtle">
                    <span className="truncate text-ink">{l.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      {l.businessCount ? `${l.businessCount} ${l.businessCount === 1 ? "business" : "businesses"}` : "None yet"}
                      <ChevronRight size={14} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
