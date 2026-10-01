import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Compact check mark (cards, lists) or the full "Covenant Verified" label (storefront, profile). */
export function VerifiedBadge({ label = false, className }: { label?: boolean; className?: string }) {
  if (label) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[13px] font-medium text-accent", className)}>
        <BadgeCheck size={15} strokeWidth={2} aria-hidden />
        Covenant Verified
      </span>
    );
  }
  return (
    <span className={cn("inline-flex text-accent", className)} title="Covenant Verified">
      <BadgeCheck size={13} strokeWidth={2.25} aria-hidden />
      <span className="sr-only">Covenant Verified</span>
    </span>
  );
}
