import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, Pagination } from "@/components/admin/AdminUi";
import { Stars } from "@/components/market/ReviewCard";
import { Badge } from "@/components/ui/Badge";
import { setReviewHidden } from "@/lib/actions/admin";
import { ADMIN_PAGE_SIZE, getAdminReviews } from "@/lib/queries/admin";
import { formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getAdminReviews(page);
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Reviews</h1>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} className="flex gap-0.5" />
                {r.is_hidden && <Badge tone="danger">Hidden</Badge>}
              </div>
              {r.body && <p className="mt-1 text-sm">{r.body}</p>}
              <p className="mt-1 text-xs text-muted">
                {r.author} on {r.product ? <Link href={`/p/${r.product.slug}`} className="hover:underline">{r.product.title}</Link> : "a deleted listing"} ({r.business?.name}) · {formatRelative(r.created_at)}
              </p>
            </div>
            {r.is_hidden ? (
              <ActionButton label="Show" action={setReviewHidden.bind(null, r.id, false)} />
            ) : (
              <ActionButton label="Hide" variant="ghost" action={setReviewHidden.bind(null, r.id, true)} confirm={{ title: "Hide this review?", body: "It's removed from the listing and store, and ratings are recalculated.", cta: "Hide review" }} />
            )}
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-sm text-muted">No reviews yet.</li>}
      </ul>
      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(n) => `/admin/reviews?page=${n}`} />
    </div>
  );
}
