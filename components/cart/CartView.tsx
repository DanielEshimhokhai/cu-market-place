"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Info, ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/market/PurchasePanel";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { groupBySeller, lineKey, MAX_LINE_QTY, reconcileLines, type CartLine, type LineNotice } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";
import { shouldReconcile } from "@/lib/checkout-errors";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { placeOrders, reconcileCart } from "@/lib/actions/checkout";

type Fulfilment = "pickup" | "delivery";
type Viewer = { signedIn: boolean; verified: boolean; businessId: string | null };

const NOTICE: Record<LineNotice, { text: string; tone: "warning" | "danger" }> = {
  price: { text: "Price updated", tone: "warning" },
  quantity: { text: "Quantity reduced to what's in stock", tone: "warning" },
  unavailable: { text: "No longer available", tone: "danger" },
};

export function CartView({ viewer, sellers }: { viewer: Viewer; sellers: Record<string, { verified: boolean; location: string | null }> }) {
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [notices, setNotices] = useState<Record<string, LineNotice>>({});
  const [checking, setChecking] = useState(false);
  const [placing, startPlacing] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, { fulfilment: Fulfilment; note: string }>>({});
  const reconciledOnce = useRef(false);

  const reconcile = async (lines: CartLine[]) => {
    if (!lines.length) return lines;
    setChecking(true);
    try {
      const live = await reconcileCart(lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })));
      const result = reconcileLines(lines, live);
      setNotices(result.notices);
      cart.replace(result.lines);
      return result.lines;
    } finally {
      setChecking(false);
    }
  };

  // Re-check prices and stock against the database once the stored cart has loaded.
  useEffect(() => {
    if (cart.ready && !reconciledOnce.current) {
      reconciledOnce.current = true;
      void reconcile(cart.lines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  const groups = useMemo(() => groupBySeller(cart.lines), [cart.lines]);
  const unavailable = cart.lines.filter((l) => notices[lineKey(l)] === "unavailable");
  const orderable = groups
    .map((g) => ({ ...g, lines: g.lines.filter((l) => notices[lineKey(l)] !== "unavailable") }))
    .filter((g) => g.lines.length);
  const total = orderable.reduce((n, g) => n + g.lines.reduce((s, l) => s + l.unitPriceKobo * l.quantity, 0), 0);
  const ownGroup = orderable.find((g) => g.businessId === viewer.businessId);

  const fulfilmentFor = (g: (typeof groups)[number]): Fulfilment => {
    const chosen = choices[g.businessId]?.fulfilment;
    if (chosen === "delivery" && g.deliveryAvailable) return "delivery";
    if (chosen === "pickup" && g.pickupAvailable) return "pickup";
    return g.pickupAvailable ? "pickup" : "delivery";
  };

  const place = () =>
    startPlacing(async () => {
      setError(null);
      const lines = orderable.flatMap((g) => g.lines);
      const r = await placeOrders({
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitPriceKobo: l.unitPriceKobo })),
        groups: orderable.map((g) => ({ businessId: g.businessId, fulfilment: fulfilmentFor(g), note: choices[g.businessId]?.note ?? "" })),
      });
      if (!r.ok) {
        setError(r.error);
        if (shouldReconcile(r.code)) await reconcile(cart.lines);
        return;
      }
      cart.clearBusinesses(orderable.map((g) => g.businessId));
      toast.show(r.orders.length > 1 ? `${r.orders.length} orders placed` : "Order placed", { tone: "success" });
      router.push(`/orders?placed=${r.orders.map((o) => o.number).join(",")}`);
    });

  if (!cart.ready) return <div className="h-64" aria-busy />;

  if (!cart.lines.length) {
    return (
      <EmptyState
        className="mt-6"
        icon={ShoppingBag}
        title="Your cart is empty."
        body="Browse the marketplace and add something you like."
        action={{ label: "Browse the marketplace", href: "/browse" }}
      />
    );
  }

  const cta = orderable.length > 1 ? `Place ${orderable.length} orders` : "Place order";

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="space-y-4">
        {groups.length > 1 && (
          <p className="flex gap-2 rounded-card border border-line bg-surface p-3 text-[13px] leading-5 text-ink">
            <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <span>
              Your cart has items from {groups.length} sellers, so it will be placed as {groups.length} separate orders. Each seller confirms and
              prepares their own order.
            </span>
          </p>
        )}

        {groups.map((g) => {
          const seller = sellers[g.businessId];
          const fulfilment = fulfilmentFor(g);
          return (
            <section key={g.businessId} className="rounded-card border border-line bg-surface" aria-label={`Order from ${g.businessName}`}>
              <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/b/${g.businessSlug}`} className="flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                    <span className="truncate">{g.businessName}</span>
                    {seller?.verified && <VerifiedBadge />}
                  </Link>
                  {seller?.location && <p className="text-xs text-muted">{seller.location}</p>}
                </div>
                <span className="tabular text-sm text-muted">
                  {formatNaira(g.lines.filter((l) => notices[lineKey(l)] !== "unavailable").reduce((s, l) => s + l.unitPriceKobo * l.quantity, 0))}
                </span>
              </header>

              <ul className="divide-y divide-line">
                {g.lines.map((l) => {
                  const key = lineKey(l);
                  const notice = notices[key];
                  const dead = notice === "unavailable";
                  return (
                    <li key={key} className={cn("flex gap-3 px-4 py-3", dead && "opacity-60")}>
                      <Link href={`/p/${l.productSlug}`} className="relative size-16 shrink-0 overflow-hidden rounded-control bg-subtle">
                        {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/p/${l.productSlug}`} className="line-clamp-2 text-sm font-medium text-ink hover:underline">{l.title}</Link>
                            {l.variantLabel && <p className="text-xs text-muted">{l.variantLabel}</p>}
                          </div>
                          <p className="tabular shrink-0 text-sm font-medium text-ink">{formatNaira(l.unitPriceKobo * l.quantity)}</p>
                        </div>
                        {notice && <Badge tone={NOTICE[notice].tone} className="mt-1">{NOTICE[notice].text}</Badge>}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          {dead ? (
                            <span className="text-xs text-muted">Remove it to continue with the rest of your cart.</span>
                          ) : (
                            <QuantityStepper size="sm" value={l.quantity} max={Math.min(MAX_LINE_QTY, l.maxQuantity ?? MAX_LINE_QTY)} onChange={(n) => cart.setQty(key, n)} />
                          )}
                          <button type="button" onClick={() => cart.remove(key)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
                            <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-3 border-t border-line px-4 py-3">
                <fieldset>
                  <legend className="mb-1 text-[13px] font-medium text-ink">How do you want to get it?</legend>
                  <div className="flex flex-wrap gap-x-6">
                    <Checkbox
                      type="radio"
                      name={`f-${g.businessId}`}
                      label="Pickup"
                      disabled={!g.pickupAvailable}
                      checked={fulfilment === "pickup"}
                      onChange={() => setChoices((c) => ({ ...c, [g.businessId]: { note: c[g.businessId]?.note ?? "", fulfilment: "pickup" } }))}
                    />
                    <Checkbox
                      type="radio"
                      name={`f-${g.businessId}`}
                      label={g.deliveryAvailable ? "Delivery" : "Delivery (not offered)"}
                      disabled={!g.deliveryAvailable}
                      checked={fulfilment === "delivery"}
                      onChange={() => setChoices((c) => ({ ...c, [g.businessId]: { note: c[g.businessId]?.note ?? "", fulfilment: "delivery" } }))}
                    />
                  </div>
                </fieldset>
                <Textarea
                  aria-label={`Note for ${g.businessName}`}
                  placeholder={fulfilment === "delivery" ? "Delivery details: your hall and a good time" : "Anything the seller should know?"}
                  maxLength={200}
                  value={choices[g.businessId]?.note ?? ""}
                  onChange={(e) => setChoices((c) => ({ ...c, [g.businessId]: { fulfilment: c[g.businessId]?.fulfilment ?? fulfilment, note: e.target.value } }))}
                  rows={2}
                  className="text-[13px]"
                />
              </div>
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-[15px] font-semibold">Summary</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {orderable.map((g) => (
              <div key={g.businessId} className="flex justify-between gap-3">
                <dt className="truncate text-muted">{g.businessName}</dt>
                <dd className="tabular text-ink">{formatNaira(g.lines.reduce((s, l) => s + l.unitPriceKobo * l.quantity, 0))}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatNaira(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            Payment: pay the seller on pickup or delivery. Never pay before an order is confirmed. Delivery fees, if any, are agreed with the seller.
          </p>

          {error && <p role="alert" className="mt-3 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
          {unavailable.length > 0 && !error && (
            <p className="mt-3 text-[13px] text-warning">{unavailable.length === 1 ? "1 item is" : `${unavailable.length} items are`} unavailable and won&apos;t be ordered.</p>
          )}

          <div className="mt-4">
            {!viewer.signedIn ? (
              <Link href="/auth/sign-in?next=/cart" className={buttonClass("primary", "lg", "w-full")}>Sign in to order</Link>
            ) : !viewer.verified ? (
              <p className="rounded-control bg-warning-soft px-3 py-2 text-[13px] text-warning">Confirm your Covenant University email before ordering.</p>
            ) : ownGroup ? (
              <p className="rounded-control bg-warning-soft px-3 py-2 text-[13px] text-warning">Remove items from your own store to continue.</p>
            ) : (
              <Button size="lg" className="w-full" loading={placing} disabled={checking || !orderable.length} onClick={place}>
                {checking ? "Checking prices…" : cta}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
