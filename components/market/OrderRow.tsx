import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatNaira } from "@/lib/money";
import type { OrderSummary } from "@/lib/queries/orders";
import { formatRelative } from "@/lib/time";
import { OrderStatusBadge } from "./OrderStatus";
import { VerifiedBadge } from "./VerifiedBadge";

export function OrderRow({ order, href, perspective = "buyer" }: { order: OrderSummary; href: string; perspective?: "buyer" | "seller" }) {
  const first = order.items[0];
  const more = order.items.length - 1;
  const who = perspective === "buyer" ? { name: order.business.name, verified: order.business.verified } : order.buyer ?? { name: "Buyer", verified: false };
  return (
    <li className="relative">
      <Link href={href} className="flex gap-3 px-4 py-3.5 hover:bg-subtle">
        <div className="flex shrink-0 -space-x-3">
          {order.items.slice(0, 3).map((i) => (
            <span key={i.id} className="relative size-12 overflow-hidden rounded-control border-2 border-surface bg-subtle">
              {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1 text-sm font-medium text-ink">
              <span className="truncate">{who.name}</span>
              {who.verified && <VerifiedBadge />}
            </p>
            <p className="tabular shrink-0 text-sm font-medium text-ink">{formatNaira(order.subtotal_kobo)}</p>
          </div>
          <p className="truncate text-[13px] text-muted">
            {first?.title_snapshot}
            {more > 0 && ` + ${more} more`}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <OrderStatusBadge status={order.status} />
            <span>#{order.number}</span>
            <span aria-hidden>·</span>
            <span>{formatRelative(order.created_at)}</span>
            <span aria-hidden>·</span>
            <span>{order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
            {perspective === "buyer" && order.reviewable && <span className="font-medium text-accent">Leave a review</span>}
          </div>
        </div>
        <ChevronRight size={16} className="mt-3.5 shrink-0 text-faint" aria-hidden />
      </Link>
    </li>
  );
}
