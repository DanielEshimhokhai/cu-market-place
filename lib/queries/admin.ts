import "server-only";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { shortName } from "@/lib/names";

export const ADMIN_PAGE_SIZE = 50;
const range = (page: number) => [(page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1] as const;

export type Counts = {
  users: number; active_users_30d: number; sellers: number; unverified_sellers: number; listings: number;
  orders_30d: number; open_reports: number; demo_rows: number;
};

export async function getCounts(): Promise<Counts> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("marketplace_counts");
  if (error) throw error;
  return data as Counts;
}

export type ReportView = {
  id: string; reason: string; details: string | null; status: "open" | "reviewing" | "resolved" | "dismissed"; created_at: string;
  resolution_note: string | null; reporter: string;
  target: { type: "product" | "business" | "user" | "review"; id: string; label: string; href: string | null; productId?: string; businessId?: string };
};

export async function getReports(status: "open" | "closed" | "all", page = 1): Promise<{ items: ReportView[]; total: number }> {
  const supabase = await createClient();
  let q = supabase
    .from("reports")
    .select("id, reason, details, status, created_at, resolution_note, target_type, target_id, reporter:public_profiles!reports_reporter_id_fkey(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  if (status === "open") q = q.in("status", ["open", "reviewing"]);
  if (status === "closed") q = q.in("status", ["resolved", "dismissed"]);
  const { data, count, error } = await q;
  if (error) throw error;
  type Row = Omit<ReportView, "target" | "reporter"> & { target_type: ReportView["target"]["type"]; target_id: string; reporter: { display_name: string } | null };
  const rows = data as unknown as Row[];
  const ids = (t: string) => rows.filter((r) => r.target_type === t).map((r) => r.target_id);

  const [products, businesses, reviews, users] = await Promise.all([
    ids("product").length ? supabase.from("products").select("id, title, slug, business_id").in("id", ids("product")) : { data: [] },
    ids("business").length ? supabase.from("businesses").select("id, name, slug").in("id", ids("business")) : { data: [] },
    ids("review").length ? supabase.from("reviews").select("id, body, rating, product:products(slug, title)").in("id", ids("review")) : { data: [] },
    ids("user").length ? supabase.from("public_profiles").select("id, display_name").in("id", ids("user")) : { data: [] },
  ]);
  const p = new Map((products.data ?? []).map((x) => [x.id as string, x as { title: string; slug: string; business_id: string }]));
  const b = new Map((businesses.data ?? []).map((x) => [x.id as string, x as { name: string; slug: string }]));
  const rv = new Map((reviews.data ?? []).map((x) => [x.id as string, x as unknown as { body: string | null; rating: number; product: { slug: string; title: string } | null }]));
  const u = new Map((users.data ?? []).map((x) => [x.id as string, x as { display_name: string }]));

  const target = (r: Row): ReportView["target"] => {
    const base = { type: r.target_type, id: r.target_id };
    switch (r.target_type) {
      case "product": {
        const x = p.get(r.target_id);
        return { ...base, label: x?.title ?? "Deleted listing", href: x ? `/p/${x.slug}` : null, productId: x ? r.target_id : undefined, businessId: x?.business_id };
      }
      case "business": {
        const x = b.get(r.target_id);
        return { ...base, label: x?.name ?? "Deleted store", href: x ? `/b/${x.slug}` : null, businessId: x ? r.target_id : undefined };
      }
      case "review": {
        const x = rv.get(r.target_id);
        return { ...base, label: x ? `${x.rating}★ review${x.product ? ` on ${x.product.title}` : ""}: “${(x.body ?? "").slice(0, 80)}”` : "Deleted review", href: x?.product ? `/p/${x.product.slug}#reviews` : null };
      }
      default:
        return { ...base, label: u.get(r.target_id)?.display_name ?? "User", href: null };
    }
  };
  return {
    items: rows.map((r) => ({ ...r, reporter: shortName(r.reporter?.display_name ?? ""), target: target(r) })),
    total: count ?? 0,
  };
}

export async function getAdminListings(q: string, status: string, page = 1) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, slug, title, status, price_kobo, created_at, is_demo, images:product_images(path, position), business:businesses(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  if (status && status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q.replace(/[%_\\,()]/g, " ")}%`);
  const { data, count, error } = await query;
  if (error) throw error;
  type Row = { id: string; slug: string; title: string; status: string; price_kobo: number; created_at: string; is_demo: boolean; images: { path: string; position: number }[]; business: { name: string; slug: string } | null };
  return {
    items: (data as unknown as Row[]).map((r) => ({ ...r, image: imageUrl([...r.images].sort((a, b) => a.position - b.position)[0]?.path) })),
    total: count ?? 0,
  };
}

export async function getAdminSellers(filter: string, page = 1) {
  const supabase = await createClient();
  let query = supabase
    .from("businesses")
    .select("id, slug, name, verified, status, rating_avg, rating_count, created_at, is_demo, category:categories(name), products(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  if (filter === "unverified") query = query.eq("verified", false).eq("status", "active");
  if (filter === "suspended") query = query.eq("status", "suspended");
  const { data, count, error } = await query;
  if (error) throw error;
  type Row = { id: string; slug: string; name: string; verified: boolean; status: "active" | "suspended"; rating_avg: number; rating_count: number; created_at: string; is_demo: boolean; category: { name: string } | null; products: { count: number }[] };
  return { items: data as unknown as Row[], total: count ?? 0 };
}

export async function getAdminUsers(q: string, page = 1) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, affiliation, cu_verified, created_at, is_demo", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  if (q) {
    const safe = q.replace(/[%_\\,()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  const { data, count, error } = await query;
  if (error) throw error;
  type Row = { id: string; full_name: string; email: string; role: "student" | "staff" | "admin"; affiliation: string; cu_verified: boolean; created_at: string; is_demo: boolean };
  return { items: data as Row[], total: count ?? 0 };
}

export async function getAdminReviews(page = 1) {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("reviews")
    .select("id, rating, body, is_hidden, created_at, author:public_profiles!reviews_author_id_fkey(display_name), product:products(title, slug), business:businesses(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  if (error) throw error;
  type Row = { id: string; rating: number; body: string | null; is_hidden: boolean; created_at: string; author: { display_name: string } | null; product: { title: string; slug: string } | null; business: { name: string } | null };
  return { items: (data as unknown as Row[]).map((r) => ({ ...r, author: shortName(r.author?.display_name ?? "") })), total: count ?? 0 };
}

export async function getAdminCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, slug, name, kind, sort, is_active").order("sort");
  if (error) throw error;
  return data as { id: string; slug: string; name: string; kind: "product" | "service"; sort: number; is_active: boolean }[];
}
