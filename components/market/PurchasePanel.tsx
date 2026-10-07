"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/lib/cart/store";
import { MAX_LINE_QTY } from "@/lib/cart/cart";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import type { Variant } from "@/lib/queries/product";
import { SaveButton } from "./SaveButton";

type Props = {
  product: {
    id: string; slug: string; title: string; kind: "product" | "service"; price_kobo: number; stock: number | null;
    image: string | null; allows_pickup: boolean; allows_delivery: boolean; variants: Variant[];
  };
  business: { id: string; slug: string; name: string };
  saved: boolean;
  isOwner: boolean;
  messageHref: string;
};

export function QuantityStepper({ value, max, onChange, size = "md" }: { value: number; max: number; onChange: (n: number) => void; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center rounded-control border border-line bg-surface">
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)} className={cn(box, "inline-flex items-center justify-center text-ink disabled:text-faint")}>
        <Minus size={15} strokeWidth={1.75} />
      </button>
      <span className="tabular w-8 text-center text-sm" aria-live="polite" aria-label={`Quantity ${value}`}>{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={cn(box, "inline-flex items-center justify-center text-ink disabled:text-faint")}>
        <Plus size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function PurchasePanel({ product, business, saved, isOwner, messageHref }: Props) {
  const cart = useCart();
  const toast = useToast();
  const groups = useMemo(() => {
    const map = new Map<string, Variant[]>();
    product.variants.forEach((v) => map.set(v.name, [...(map.get(v.name) ?? []), v]));
    return [...map.entries()];
  }, [product.variants]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [needVariant, setNeedVariant] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = product.price_kobo + (variant?.price_delta_kobo ?? 0);
  const available = variant ? variant.stock : product.stock;
  const soldOut = product.stock === 0 || (variant?.stock === 0);
  const maxQty = Math.max(1, Math.min(MAX_LINE_QTY, available ?? MAX_LINE_QTY));
  const isService = product.kind === "service";

  const add = () => {
    if (groups.length && !variant) {
      setNeedVariant(true);
      return;
    }
    cart.add({
      productId: product.id, variantId: variant?.id ?? null, variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
      quantity: qty, title: product.title, productSlug: product.slug, imageUrl: product.image, unitPriceKobo: unitPrice,
      businessId: business.id, businessName: business.name, businessSlug: business.slug, maxQuantity: available,
      allowsPickup: product.allows_pickup, allowsDelivery: product.allows_delivery,
    });
    toast.show(isService ? "Added to cart. You'll arrange the time with the seller." : "Added to cart", { action: { label: "View cart", href: "/cart" } });
  };

  if (isOwner) {
    return (
      <div className="rounded-card border border-line bg-surface p-4 text-sm">
        <p className="text-muted">This is your listing.</p>
        <Link href={`/sell/products/${product.id}`} className={buttonClass("secondary", "md", "mt-3")}>Edit listing</Link>
      </div>
    );
  }

  const cta = soldOut ? "Sold out" : isService ? "Book this service" : "Add to cart";

  return (
    <div className="space-y-5">
      {groups.map(([name, values]) => (
        <fieldset key={name}>
          <legend className="mb-2 text-[13px] font-medium text-ink">
            {name}
            {variant && variant.name === name && <span className="ml-1.5 font-normal text-muted">{variant.value}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => {
              const out = v.stock === 0;
              const selected = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={selected}
                  onClick={() => {
                    setVariantId(v.id);
                    setNeedVariant(false);
                    setQty(1);
                  }}
                  className={cn(
                    "h-9 min-w-11 rounded-control border px-3 text-sm transition-colors duration-150",
                    selected ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-line-strong",
                    out && "cursor-not-allowed text-faint line-through hover:border-line",
                  )}
                >
                  {v.value}
                  {v.price_delta_kobo > 0 && <span className={cn("ml-1 text-xs", selected ? "text-white/70" : "text-muted")}>+{formatNaira(v.price_delta_kobo)}</span>}
                </button>
              );
            })}
          </div>
          {needVariant && <p role="alert" className="mt-1.5 text-xs text-danger">Choose a {name.toLowerCase()}</p>}
        </fieldset>
      ))}

      {!isService && !soldOut && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink">Quantity</p>
          <QuantityStepper value={qty} max={maxQty} onChange={setQty} />
        </div>
      )}

      <div className="hidden gap-2 md:flex">
        <Button size="lg" className="flex-1" disabled={soldOut} onClick={add}>{cta}</Button>
        <Link href={messageHref} className={buttonClass("secondary", "lg")}>Message seller</Link>
        <SaveButton productId={product.id} saved={saved} variant="button" />
      </div>
      <div className="flex gap-2 md:hidden">
        <Link href={messageHref} className={buttonClass("secondary", "md", "flex-1")}>Message seller</Link>
        <SaveButton productId={product.id} saved={saved} variant="button" className="size-10" />
      </div>

      {/* Mobile sticky action bar (the bottom nav is hidden on product pages). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="min-w-0 flex-1">
          <p className="tabular text-[17px] font-semibold text-ink">{formatNaira(unitPrice)}</p>
          <p className="truncate text-xs text-muted">{variant ? `${variant.name}: ${variant.value}` : business.name}</p>
        </div>
        <Button size="lg" disabled={soldOut} onClick={add} className="min-w-40">{cta}</Button>
      </div>
    </div>
  );
}
