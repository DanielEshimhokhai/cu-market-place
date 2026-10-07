import type { RatingSummary } from "@/lib/queries/product";
import { Stars } from "./ReviewCard";

export function ReviewSummary({ summary }: { summary: RatingSummary }) {
  if (!summary.count) return null;
  const max = Math.max(...Object.values(summary.breakdown), 1);
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10">
      <div>
        <p className="tabular text-[32px] leading-none font-semibold tracking-tight text-ink">{summary.avg.toFixed(1)}</p>
        <Stars value={Math.round(summary.avg)} className="mt-2 flex gap-0.5" />
        <p className="mt-1 text-xs text-muted">
          {summary.count} {summary.count === 1 ? "review" : "reviews"}
        </p>
      </div>
      <div className="space-y-3">
        <ul className="space-y-1" aria-label="Rating breakdown">
          {([5, 4, 3, 2, 1] as const).map((n) => (
            <li key={n} className="flex items-center gap-2 text-xs text-muted">
              <span className="tabular w-2">{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${(summary.breakdown[n] / max) * 100}%` }} />
              </span>
              <span className="tabular w-6 text-right">{summary.breakdown[n]}</span>
            </li>
          ))}
        </ul>
        {summary.aspects.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line pt-3 text-xs">
            {summary.aspects.map((a) => (
              <div key={a.label} className="flex justify-between gap-2">
                <dt className="text-muted">{a.label}</dt>
                <dd className="tabular font-medium text-ink">{a.avg.toFixed(1)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
