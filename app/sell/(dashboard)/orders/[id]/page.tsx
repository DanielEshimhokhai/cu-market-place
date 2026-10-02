import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { OrderStatusBadge, OrderTimeline } from "@/components/market/OrderStatus";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { OrderActions } from "@/components/sell/OrderActions";
import { buttonClass } from "@/components/ui/Button";
import { requireSeller } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { getOrder } from "@/lib/queries/orders";
import { formatDateTime, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Order" };

export default async function SellerOrderPage({ params }: PageProps<"/sell/orders/[id]">) {
  const { id } = await params;
  const seller = await requireSeller();
  const order = await getOrder(id, seller.id);
  if (!order || order.business.id !== seller.businessId) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/sell/orders" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ChevronLeft size={14} aria-hidden /> Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[22px] font-semibold tracking-tight">Order #{order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Placed {formatRelative(order.created_at)} · {formatDateTime(order.created_at)} · {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-4">
          <section className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
            <div>
              <p className="text-xs text-muted">Buyer</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium">
                {order.buyer?.name ?? "Buyer"}
                {order.buyer?.verified && <VerifiedBadge />}
              </p>
            </div>
            <Link href={`/messages/start?order=${order.id}`} className={buttonClass("secondary", "sm")}>Message buyer</Link>
          </section>

          {order.note && (
            <section className="rounded-card border border-line bg-surface p-4 text-sm">
              <p className="text-xs text-muted">Note from the buyer</p>
              <p className="mt-1 whitespace-pre-line">{order.note}</p>
            </section>
          )}

          <section className="rounded-card border border-line bg-surface" aria-label="Items">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 p-4">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-subtle">
                    {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.title_snapshot}</p>
                    <p className="text-xs text-muted">
                      {i.variant_snapshot && `${i.variant_snapshot} · `}
                      {i.quantity} × {formatNaira(i.unit_price_kobo)}
                    </p>
                  </div>
                  <p className="tabular text-sm font-medium">{formatNaira(i.unit_price_kobo * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-line px-4 py-3 text-[15px] font-semibold">
              <span>Total to collect</span>
              <span className="tabular">{formatNaira(order.subtotal_kobo)}</span>
            </div>
          </section>

          <OrderActions orderId={order.id} number={order.number} status={order.status} fulfilment={order.fulfilment} instructions={order.pickup_instructions} />
        </div>

        <aside className="rounded-card border border-line bg-surface p-4 md:self-start">
          <h2 className="mb-4 text-sm font-semibold">Status</h2>
          <OrderTimeline status={order.status} fulfilment={order.fulfilment} events={order.events} />
        </aside>
      </div>
    </div>
  );
}
