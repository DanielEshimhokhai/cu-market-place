import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ReviewForm } from "@/components/market/ReviewForm";
import { Stars } from "@/components/market/ReviewCard";
import { requireViewer } from "@/lib/auth";
import { getOrder } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leave a review" };

export default async function ReviewPage({ params }: PageProps<"/orders/[id]/review">) {
  const { id } = await params;
  const viewer = await requireViewer(`/orders/${id}/review`);
  const order = await getOrder(id, viewer.id);
  if (!order || order.buyer_id !== viewer.id) notFound();

  const supabase = await createClient();
  const { data: mine } = await supabase.from("reviews").select("product_id, rating").eq("order_id", id).eq("author_id", viewer.id);
  const myRating = new Map((mine ?? []).map((r) => [r.product_id as string, r.rating as number]));
  const items = order.items.filter((i) => i.product_id);

  return (
    <div className="mx-auto max-w-2xl pt-6 md:pt-10">
      <Link href={`/orders/${id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ChevronLeft size={14} aria-hidden /> Order #{order.number}
      </Link>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">Review your order from {order.business.name}</h1>
      <p className="mt-1 text-sm text-muted">Your review shows a “Verified purchase” label. Be specific and fair. It helps other students decide.</p>

      {order.status !== "completed" ? (
        <p className="mt-6 rounded-card border border-line bg-surface p-4 text-sm text-muted">You can review this order once it&apos;s completed.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((i) =>
            myRating.has(i.product_id!) ? (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-sm">
                <span className="font-medium">{i.title_snapshot}</span>
                <span className="flex items-center gap-2 text-muted">You rated this <Stars value={myRating.get(i.product_id!)!} className="flex gap-0.5" /></span>
              </div>
            ) : (
              <ReviewForm key={i.id} orderId={id} product={{ id: i.product_id!, title: i.title_snapshot, image: i.image }} />
            ),
          )}
          {items.length > 0 && items.every((i) => myRating.has(i.product_id!)) && (
            <p className="text-sm text-muted">
              All done. Thanks! <Link href={`/b/${order.business.slug}#reviews`} className="font-medium text-accent hover:underline">See the store&apos;s reviews</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
