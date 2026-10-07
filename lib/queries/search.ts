import "server-only";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { normalizeQuery } from "@/lib/search";
import type { ProductCardData } from "@/lib/types";
import { BUSINESS_SELECT, toBusiness, type BusinessCardData } from "./businesses";
import { browseProducts } from "./catalog";
import { getCategories } from "./reference";

export type Suggestions = {
  products: { slug: string; title: string; price_kobo: number; image: string | null; business: string }[];
  businesses: { slug: string; name: string; category: string | null }[];
  categories: { slug: string; name: string }[];
};

export async function suggest(raw: string): Promise<Suggestions> {
  const q = normalizeQuery(raw);
  if (!q) return { products: [], businesses: [], categories: [] };
  const supabase = createPublicClient();
  const [products, businesses, categories] = await Promise.all([
    supabase
      .rpc("search_products", { p_q: q })
      .select("slug, title, price_kobo, images:product_images(path, position), business:businesses!inner(name, status)")
      .eq("status", "active")
      .eq("business.status", "active")
      .limit(5),
    supabase.rpc("search_businesses", { p_q: q }).select("slug, name, category:categories(name)").eq("status", "active").limit(4),
    getCategories(),
  ]);
  type P = { slug: string; title: string; price_kobo: number; images: { path: string; position: number }[]; business: { name: string } };
  type B = { slug: string; name: string; category: { name: string } | null };
  const lower = q.toLowerCase();
  return {
    products: ((products.data ?? []) as unknown as P[]).map((p) => ({
      slug: p.slug,
      title: p.title,
      price_kobo: p.price_kobo,
      business: p.business.name,
      image: imageUrl([...(p.images ?? [])].sort((a, b) => a.position - b.position)[0]?.path),
    })),
    businesses: ((businesses.data ?? []) as unknown as B[]).map((b) => ({ slug: b.slug, name: b.name, category: b.category?.name ?? null })),
    categories: categories.filter((c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())).slice(0, 3),
  };
}

export async function searchBusinesses(raw: string, limit = 50): Promise<BusinessCardData[]> {
  const q = normalizeQuery(raw);
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_businesses", { p_q: q }).select(BUSINESS_SELECT).eq("status", "active").limit(limit);
  if (error) throw error;
  return (data as unknown as Parameters<typeof toBusiness>[0][]).map(toBusiness);
}

export async function searchAll(raw: string): Promise<{
  products: { items: ProductCardData[]; total: number };
  services: { items: ProductCardData[]; total: number };
  businesses: BusinessCardData[];
}> {
  const [products, services, businesses] = await Promise.all([
    browseProducts({ q: raw, kind: "product" }),
    browseProducts({ q: raw, kind: "service" }),
    searchBusinesses(raw),
  ]);
  return { products, services, businesses };
}
