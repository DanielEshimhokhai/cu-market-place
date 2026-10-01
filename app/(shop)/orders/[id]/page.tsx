import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Truck } from "lucide-react";
import { BuyerOrderActions } from "@/components/market/BuyerOrderActions";
import { OrderStatusBadge, OrderTimeline } from "@/components/market/OrderStatus";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { requireViewer } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { getOrder } from "@/lib/queries/orders";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/orders/${id}`);
  const order = await getOrder(id, viewer.id);
  // Sellers view their orders under /sell; this page is the buyer's view.
  if (!order || order.buyer_id !== viewer.id) notFound();

  const b = order.business;
  const isPickup = order.fulfilment === "pickup";
  const awaitingDetails = !order.pickup_instructions && order.status !== "cancelled" && order.status !== "completed";

  return (
    <div className="mx-auto max-w-3xl pt-6 md:pt-10">
      <Link href="/orders" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ChevronLeft size={14} aria-hidden /> Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[22px] font-semibold tracking-tight">Order #{order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-[13px] text-muted">Placed {formatDateTime(order.created_at)}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-4" aria-label="Pickup and delivery">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {isPickup ? <MapPin size={16} strokeWidth={1.75} aria-hidden /> : <Truck size={16} strokeWidth={1.75} aria-hidden />}
              {isPickup ? `Pickup${b.location ? ` at ${b.location}` : ""}` : "Delivery"}
            </h2>
            {order.pickup_instructions ? (
              <div className="mt-3 rounded-control bg-subtle p-3">
                <p className="text-xs font-medium text-muted">{isPickup ? "Pickup details" : "Delivery details"} from {b.name}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-ink">{order.pickup_instructions}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {awaitingDetails
                  ? `The seller will share exact ${isPickup ? "pickup" : "delivery"} details here once your order is confirmed.`
                  : "No details were shared for this order."}
              </p>
            )}
            {order.note && (
              <p className="mt-3 text-[13px] text-muted">
                <span className="font-medium text-ink">Your note:</span> {order.note}
              </p>
            )}
          </section>

          <section className="rounded-card border border-line bg-surface" aria-label="Items">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 p-4">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-subtle">
                    {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {i.productSlug ? (
                      <Link href={`/p/${i.productSlug}`} className="text-sm font-medium text-ink hover:underline">{i.title_snapshot}</Link>
                    ) : (
                      <p className="text-sm font-medium text-ink">{i.title_snapshot}</p>
                    )}
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
              <span>Total</span>
              <span className="tabular">{formatNaira(order.subtotal_kobo)}</span>
            </div>
            <p className="border-t border-line px-4 py-3 text-xs text-muted">Pay the seller when you collect. Never pay before the order is confirmed.</p>
          </section>

          <BuyerOrderActions
            orderId={order.id}
            number={order.number}
            status={order.status}
            reviewable={order.reviewable}
            messageHref={`/messages/start?business=${b.id}&order=${order.id}`}
          />
          <a href="#report" className="block text-xs text-muted hover:text-ink">Report a problem with this order</a>
        </div>

        <aside className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="mb-4 text-sm font-semibold">Status</h2>
            <OrderTimeline status={order.status} fulfilment={order.fulfilment} events={order.events} />
          </section>
          <Link href={`/b/${b.slug}`} className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong">
            <p className="text-xs text-muted">Seller</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-ink">
              {b.name}
              {b.verified && <VerifiedBadge />}
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
