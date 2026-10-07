"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkoutErrorMessage } from "@/lib/checkout-errors";
import type { LiveLine } from "@/lib/cart/cart";

const lineSchema = z.object({ productId: z.uuid(), variantId: z.uuid().nullable(), quantity: z.number().int().min(1).max(20) });
const linesSchema = z.array(lineSchema).min(1).max(50);

export async function reconcileCart(input: { productId: string; variantId: string | null; quantity: number }[]): Promise<LiveLine[]> {
  const parsed = linesSchema.safeParse(input);
  if (!parsed.success) return [];
  const lines = parsed.data;
  const supabase = await createClient();
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const variantIds = [...new Set(lines.map((l) => l.variantId).filter((v): v is string => !!v))];
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from("products").select("id, price_kobo, stock, status, allows_pickup, allows_delivery").in("id", productIds),
    variantIds.length
      ? supabase.from("product_variants").select("id, product_id, stock, price_delta_kobo").in("id", variantIds)
      : Promise.resolve({ data: [] as { id: string; product_id: string; stock: number | null; price_delta_kobo: number }[] }),
  ]);
  const productById = new Map((products ?? []).map((p) => [p.id as string, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id as string, v]));

  return lines.map((l) => {
    const p = productById.get(l.productId);
    const v = l.variantId ? variantById.get(l.variantId) : null;
    const variantOk = !l.variantId || (v && v.product_id === l.productId);
    if (!p || p.status !== "active" || !variantOk) {
      return { productId: l.productId, variantId: l.variantId, available: false, unitPriceKobo: 0, maxQuantity: 0, allowsPickup: true, allowsDelivery: false };
    }
    const stocks = [p.stock, v?.stock].filter((s): s is number => typeof s === "number");
    return {
      productId: l.productId,
      variantId: l.variantId,
      available: true,
      unitPriceKobo: p.price_kobo + (v?.price_delta_kobo ?? 0),
      maxQuantity: stocks.length ? Math.min(...stocks) : null,
      allowsPickup: p.allows_pickup,
      allowsDelivery: p.allows_delivery,
    };
  });
}

// The price the buyer saw is sent so the database can refuse the order if it changed (PRICE_CHANGED).
const placeLineSchema = lineSchema.extend({ unitPriceKobo: z.number().int().min(0) });
const placeSchema = z.object({
  lines: z.array(placeLineSchema).min(1).max(50),
  groups: z
    .array(z.object({ businessId: z.uuid(), fulfilment: z.enum(["pickup", "delivery"]), note: z.string().trim().max(200) }))
    .max(50),
});

export type PlaceOrdersResult =
  | { ok: true; orders: { id: string; number: number; businessId: string }[] }
  | { ok: false; error: string; code: string };

export async function placeOrders(input: z.input<typeof placeSchema>): Promise<PlaceOrdersResult> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Your cart looks invalid. Refresh and try again.", code: "INVALID_CART" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: checkoutErrorMessage("NOT_AUTHENTICATED"), code: "NOT_AUTHENTICATED" };

  const { data, error } = await supabase.rpc("place_orders", {
    p_items: parsed.data.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity, unit_price_kobo: l.unitPriceKobo })),
    p_groups: parsed.data.groups.map((g) => ({ business_id: g.businessId, fulfilment: g.fulfilment, note: g.note || null })),
  });
  if (error) return { ok: false, error: checkoutErrorMessage(error.message), code: error.message };

  revalidatePath("/orders");
  revalidatePath("/sell/orders");
  return {
    ok: true,
    orders: (data as { order_id: string; order_number: number; business_id: string }[]).map((o) => ({
      id: o.order_id,
      number: Number(o.order_number),
      businessId: o.business_id,
    })),
  };
}
