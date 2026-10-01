import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Location } from "@/lib/types";

type Props = { locations: (Location & { businessCount: number })[]; highlight?: string; className?: string };

/** A quiet schematic of campus areas. Positions are approximate and not to scale. */
export function CampusMap({ locations, highlight, className }: Props) {
  // Specific halls cluster tightly; the general "hostel area" pins are drawn as area labels instead.
  const pins = locations.filter((l) => !l.slug.startsWith("hostel-area"));
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <svg viewBox="0 0 100 100" className="block aspect-square w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Schematic campus map">
          <g stroke="var(--color-line-strong)" strokeWidth="0.5" fill="none" strokeLinecap="round">
            <path d="M50 95 V26 M34 26 H66 " />
          </g>
          <g fill="var(--color-subtle)">
            <rect x="4" y="8" width="30" height="38" rx="2.5" />
            <rect x="66" y="8" width="30" height="38" rx="2.5" />
            <rect x="34" y="40" width="32" height="30" rx="2.5" />
            <rect x="22" y="73" width="66" height="17" rx="2.5" />
          </g>
          <g fill="var(--color-faint)" fontSize="2.6" fontWeight="500">
            <text x="6" y="12.5">Male halls</text>
            <text x="68" y="12.5">Female halls</text>
            <text x="36" y="43.5">Central</text>
            <text x="86" y="88.5" textAnchor="end">Academic</text>
          </g>
          {pins.map((l) => {
            const active = l.slug === highlight;
            const has = l.businessCount > 0;
            return (
              <Link key={l.slug} href={`/locations/${l.slug}`} aria-label={`${l.name}: ${l.businessCount} ${l.businessCount === 1 ? "business" : "businesses"}`}>
                <title>{`${l.name} · ${l.businessCount} ${l.businessCount === 1 ? "business" : "businesses"}`}</title>
                <circle cx={l.map_x} cy={l.map_y} r={active ? 2.2 : 1.6} className={cn(has || active ? "fill-accent" : "fill-line-strong")} stroke="var(--color-surface)" strokeWidth="0.6" />
                <text x={l.map_x + 2.6} y={l.map_y + 0.9} fontSize="2.4" className={cn(active ? "fill-ink font-semibold" : "fill-muted")}>
                  {l.name.replace("College of ", "").replace("Centre for Learning Resources", "Library")}
                </text>
              </Link>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-faint">Schematic map, not to scale. Tap a pin to see who sells there.</figcaption>
    </figure>
  );
}
