import "server-only";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { shortName } from "@/lib/names";
import type { Fulfilment, OrderStatus } from "@/lib/orders/transitions";

export type OrderFilter = "active" | "completed" | "cancelled" | "all";
const ACTIVE: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];

export type OrderItem = { id: string; product_id: string | null; title_snapshot: string; variant_snapshot: string | null; image: string | null; unit_price_kobo: number; quantity: number; productSlug: string | null };

export type OrderSummary = {
  id: string; number: number; status: OrderStatus; fulfilment: Fulfilment; subtotal_kobo: number; created_at: string;
  business: { id: string; slug: string; name: string; verified: boolean };
  buyer: { name: string; verified: boolean } | null;
  items: OrderItem[];
  reviewable: boolean;
};

export type OrderDetail = OrderSummary & {
  note: string | null; pickup_instructions: string | null; buyer_id: string;
  confirmed_at: string | null; ready_at: string | null; completed_at: string | null; cancelled_at: string | null;
  business: OrderSummary["business"] & { owner_id: string; location: string | null; offers_delivery: boolean };
  events: { status: OrderStatus; created_at: string }[];
  reviewedProductIds: string[];
};

const SUMMARY_SELECT =
  "id, number, status, fulfilment, subtotal_kobo, created_at, " +
  "business:businesses(id, slug, name, verified), buyer:public_profiles!orders_buyer_id_fkey(full_name, cu_verified), " +
  "items:order_items(id, product_id, title_snapshot, variant_snapshot, image_snapshot, unit_price_kobo, quantity, product:products(slug))";

type Row = Omit<OrderSummary, "items" | "buyer" | "reviewable" | "number"> & {
  number: number | string;
  buyer: { full_name: string; cu_verified: boolean } | null;
  items: (Omit<OrderItem, "image" | "productSlug"> & { image_snapshot: string | null; product: { slug: string } | null })[];
};

function toSummary(r: Row, reviewed: Set<string>): OrderSummary {
  const items = r.items.map((i) => ({
    id: i.id, product_id: i.product_id, title_snapshot: i.title_snapshot, variant_snapshot: i.variant_snapshot,
    image: imageUrl(i.image_snapshot), unit_price_kobo: i.unit_price_kobo, quantity: i.quantity, productSlug: i.product?.slug ?? null,
  }));
  return {
    ...r,
    number: Number(r.number),
    buyer: r.buyer ? { name: shortName(r.buyer.full_name), verified: r.buyer.cu_verified } : null,
    items,
    reviewable: r.status === "completed" && items.some((i) => i.product_id && !reviewed.has(`${r.id}:${i.product_id}`)),
  };
}

async function reviewedKeys(orderIds: string[], userId: string): Promise<Set<string>> {
  if (!orderIds.length) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("order_id, product_id").in("order_id", orderIds).eq("author_id", userId);
  return new Set((data ?? []).map((r) => `${r.order_id}:${r.product_id}`));
}

export async function getMyOrders(userId: string, filter: OrderFilter): Promise<OrderSummary[]> {
  const supabase = await createClient();
  let q = supabase.from("orders").select(SUMMARY_SELECT).eq("buyer_id", userId).order("created_at", { ascending: false }).limit(100);
  if (filter === "active") q = q.in("status", ACTIVE);
  if (filter === "completed") q = q.eq("status", "completed");
  if (filter === "cancelled") q = q.eq("status", "cancelled");
  const { data, error } = await q;
  if (error) throw error;
  const rows = data as unknown as Row[];
  const reviewed = await reviewedKeys(rows.filter((r) => r.status === "completed").map((r) => r.id), userId);
  return rows.map((r) => toSummary(r, reviewed));
}

export async function countMyOrders(userId: string): Promise<Record<OrderFilter, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("status").eq("buyer_id", userId);
  const rows = data ?? [];
  return {
    all: rows.length,
    active: rows.filter((r) => ACTIVE.includes(r.status as OrderStatus)).length,
    completed: rows.filter((r) => r.status === "completed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
  };
}

export async function getSellerOrders(businessId: string, statuses: OrderStatus[] | null): Promise<OrderSummary[]> {
  const supabase = await createClient();
  let q = supabase.from("orders").select(SUMMARY_SELECT).eq("business_id", businessId).order("created_at", { ascending: false }).limit(200);
  if (statuses) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as Row[]).map((r) => toSummary(r, new Set()));
}

/** RLS returns the order only to its buyer, the owning seller, or an admin. */
export async function getOrder(id: string, viewerId: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, number, status, fulfilment, subtotal_kobo, created_at, note, pickup_instructions, buyer_id, confirmed_at, ready_at, completed_at, cancelled_at, " +
        "business:businesses(id, slug, name, verified, owner_id, offers_delivery, location:locations(name)), " +
        "buyer:public_profiles!orders_buyer_id_fkey(full_name, cu_verified), " +
        "items:order_items(id, product_id, title_snapshot, variant_snapshot, image_snapshot, unit_price_kobo, quantity, product:products(slug)), " +
        "events:order_events(status, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type DRow = Row & Omit<OrderDetail, keyof OrderSummary | "business" | "reviewedProductIds"> & {
    business: OrderSummary["business"] & { owner_id: string; offers_delivery: boolean; location: { name: string } | null };
  };
  const row = data as unknown as DRow;
  const reviewed = row.buyer_id === viewerId ? await reviewedKeys([row.id], viewerId) : new Set<string>();
  const summary = toSummary(row, reviewed);
  return {
    ...summary,
    note: row.note,
    pickup_instructions: row.pickup_instructions,
    buyer_id: row.buyer_id,
    confirmed_at: row.confirmed_at,
    ready_at: row.ready_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
    business: { ...summary.business, owner_id: row.business.owner_id, offers_delivery: row.business.offers_delivery, location: row.business.location?.name ?? null },
    events: [...row.events].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    reviewedProductIds: [...reviewed].map((k) => k.split(":")[1]),
  };
}
