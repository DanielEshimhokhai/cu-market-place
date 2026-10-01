import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatRelative } from "@/lib/time";
import type { ReviewView } from "@/lib/queries/product";
import { StarIcon } from "./Rating";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= value} className={i <= value ? "text-ink" : "text-line-strong"} />
      ))}
    </span>
  );
}

export function ReviewCard({ review, showProduct = false, action }: { review: ReviewView; showProduct?: boolean; action?: React.ReactNode }) {
  return (
    <article className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} className="flex gap-0.5" />
        <span className="flex items-center gap-2 text-xs text-faint">
          {formatRelative(review.created_at)}
          {action}
        </span>
      </div>
      {review.body && <p className="mt-2 text-sm leading-6 text-ink">{review.body}</p>}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span className="font-medium text-ink">{review.author}</span>
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 size={12} strokeWidth={2} aria-hidden />
          Verified purchase
        </span>
        {showProduct && review.productTitle && (
          <>
            <span aria-hidden>·</span>
            {review.productSlug ? (
              <Link href={`/p/${review.productSlug}`} className="hover:text-ink hover:underline">{review.productTitle}</Link>
            ) : (
              <span>{review.productTitle}</span>
            )}
          </>
        )}
      </p>
    </article>
  );
}
