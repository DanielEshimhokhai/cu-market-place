import "server-only";
import { createClient } from "@/lib/supabase/server";
import { imageUrl, mediaUrl } from "@/lib/images";
import type { OpeningHours } from "@/lib/hours";
import { getSellerOrders, type OrderSummary } from "./orders";

const OPEN = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"] as const;
const DAY = 24 * 60 * 60 * 1000;
/** YYYY-MM-DD in Lagos time (UTC+1, no DST). */
const lagosDay = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);

export type SellerBusiness = {
  id: string; slug: string; name: string; tagline: string | null; description: string | null; category_id: string | null;
  location_id: string | null; seller_type: "student" | "business"; verified: boolean; status: "active" | "suspended";
  hours: OpeningHours; offers_delivery: boolean; delivery_note: string | null; logo_url: string | null; logo_path: string | null;
  rating_avg: number; rating_count: number;
};

export async function getSellerBusiness(businessId: string): Promise<SellerBusiness | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, tagline, description, category_id, location_id, seller_type, verified, status, hours, offers_delivery, delivery_note, logo_url, rating_avg, rating_count")
    .eq("id", businessId)
    .maybeSingle();
  if (!data) return null;
  return { ...data, logo_path: data.logo_url, logo_url: mediaUrl(data.logo_url), rating_avg: Number(data.rating_avg) } as SellerBusiness;
}

export type SellerOverview = {
  todaySalesKobo: number; todayOrders: number; openOrders: number; newOrders: number; activeListings: number; lowStock: number;
  last7: { date: string; label: string; salesKobo: number; orders: number }[];
  recentOrders: OrderSummary[];
  topProducts: { id: string; slug: string; title: string; orders: number; views: number }[];
};

export async function getSellerOverview(businessId: string): Promise<SellerOverview> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const [{ data: orders }, { data: products }, recentOrders] = await Promise.all([
    supabase.from("orders").select("status, subtotal_kobo, created_at").eq("business_id", businessId).gte("created_at", since),
    supabase.from("products").select("id, slug, title, status, stock, order_count, view_count").eq("business_id", businessId),
    getSellerOrders(businessId, null).then((o) => o.slice(0, 5)),
  ]);
  const { count: openCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", [...OPEN]);
  const { count: newCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "pending");

  const today = lagosDay(new Date());
  const live = (orders ?? []).filter((o) => o.status !== "cancelled");
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * DAY);
    const key = lagosDay(d);
    const dayOrders = live.filter((o) => lagosDay(new Date(o.created_at)) === key);
    return {
      date: key,
      label: i === 6 ? "Today" : d.toLocaleDateString("en-NG", { weekday: "short", timeZone: "Africa/Lagos" }),
      salesKobo: dayOrders.reduce((s, o) => s + o.subtotal_kobo, 0),
      orders: dayOrders.length,
    };
  });
  const todays = live.filter((o) => lagosDay(new Date(o.created_at)) === today);
  const active = (products ?? []).filter((p) => p.status === "active");
  return {
    todaySalesKobo: todays.reduce((s, o) => s + o.subtotal_kobo, 0),
    todayOrders: todays.length,
    openOrders: openCount ?? 0,
    newOrders: newCount ?? 0,
    activeListings: active.length,
    lowStock: active.filter((p) => p.stock !== null && p.stock <= 3).length,
    last7,
    recentOrders,
    topProducts: [...active]
      .sort((a, b) => b.order_count - a.order_count || b.view_count - a.view_count)
      .slice(0, 5)
      .map((p) => ({ id: p.id, slug: p.slug, title: p.title, orders: p.order_count, views: p.view_count })),
  };
}

export type SellerProductRow = {
  id: string; slug: string; title: string; kind: "product" | "service"; price_kobo: number; stock: number | null;
  status: "draft" | "active" | "paused" | "removed"; view_count: number; order_count: number; image: string | null; updated_at: string;
};

export async function getSellerProducts(businessId: string): Promise<SellerProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, kind, price_kobo, stock, status, view_count, order_count, updated_at, images:product_images(path, position)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => {
    const first = [...((p.images as { path: string; position: number }[]) ?? [])].sort((a, b) => a.position - b.position)[0];
    return { ...p, image: imageUrl(first?.path) } as SellerProductRow;
  });
}

export type EditableProduct = {
  id: string; title: string; kind: "product" | "service"; category_id: string | null; description: string; price_kobo: number;
  compare_at_kobo: number | null; condition: "new" | "like_new" | "used"; stock: number | null; pickup_location_id: string | null;
  allows_pickup: boolean; allows_delivery: boolean; delivery_note: string | null; status: "draft" | "active" | "paused" | "removed";
  images: { path: string; url: string }[];
  variants: { name: string; value: string; stock: number | null; price_delta_kobo: number }[];
};

export async function getEditableProduct(businessId: string, id: string): Promise<EditableProduct | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, title, kind, category_id, description, price_kobo, compare_at_kobo, condition, stock, pickup_location_id, allows_pickup, allows_delivery, delivery_note, status, " +
        "images:product_images(path, position), variants:product_variants(name, value, stock, price_delta_kobo, position)",
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<EditableProduct, "images" | "variants"> & {
    images: { path: string; position: number }[];
    variants: (EditableProduct["variants"][number] & { position: number })[];
  };
  return {
    ...row,
    images: [...row.images].sort((a, b) => a.position - b.position).map((i) => ({ path: i.path, url: imageUrl(i.path)! })),
    variants: [...row.variants].sort((a, b) => a.position - b.position).map((v) => ({ name: v.name, value: v.value, stock: v.stock, price_delta_kobo: v.price_delta_kobo })),
  };
}
