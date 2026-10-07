import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { BusinessSummary } from "@/lib/types";
import { OpenStatus } from "./OpenStatus";
import { Rating } from "./Rating";
import { VerifiedBadge } from "./VerifiedBadge";

export function BusinessCard({ business: b, compact = false, className }: { business: BusinessSummary; compact?: boolean; className?: string }) {
  const listings = b.product_count ?? 0;
  return (
    <Link
      href={`/b/${b.slug}`}
      className={cn(
        "relative flex min-w-0 gap-3 rounded-card border border-line bg-surface p-3 transition-colors duration-150 hover:border-line-strong",
        compact && "w-[260px] shrink-0 snap-start",
        className,
      )}
    >
      <Avatar name={b.name} src={b.logo_url} size={48} square />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-1">
          <span className="truncate text-[15px] font-medium text-ink">{b.name}</span>
          {b.verified && <VerifiedBadge />}
        </p>
        <p className="truncate text-[13px] text-muted">
          {[b.category?.name, b.location?.name].filter(Boolean).join(" · ")}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted">
          <Rating avg={b.rating_avg} count={b.rating_count} />
          <span aria-hidden>·</span>
          <span>{listings} {listings === 1 ? "listing" : "listings"}</span>
        </p>
        <OpenStatus hours={b.hours} className="pt-0.5 text-xs" />
      </div>
    </Link>
  );
}
