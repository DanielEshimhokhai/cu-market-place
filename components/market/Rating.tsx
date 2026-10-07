import { cn } from "@/lib/cn";

export function StarIcon({ className, filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("inline-block size-3 shrink-0", className)}>
      <path
        d="M10 1.8l2.47 5.2 5.68.7-4.2 3.9 1.1 5.62L10 14.4l-5.05 2.82 1.1-5.62-4.2-3.9 5.68-.7z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
      />
    </svg>
  );
}

/** "★ 4.8 (23)". Shows "New" when there are no reviews yet. */
export function Rating({ avg, count, className, showCount = true }: { avg: number; count: number; className?: string; showCount?: boolean }) {
  if (!count) return <span className={cn("text-muted", className)}>New</span>;
  return (
    <span className={cn("tabular inline-flex items-center gap-1", className)} aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`}>
      <StarIcon className="text-ink" />
      <span className="text-ink">{avg.toFixed(1)}</span>
      {showCount && <span>({count})</span>}
    </span>
  );
}
