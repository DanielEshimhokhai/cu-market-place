import "server-only";
import { createClient } from "@/lib/supabase/server";
import { imageUrl, mediaUrl } from "@/lib/images";
import { shortName } from "@/lib/names";
import type { Viewer } from "@/lib/auth";
import type { OrderStatus } from "@/lib/orders/transitions";

export type Message = { id: string; sender_id: string; body: string; created_at: string; product_id: string | null; order_id: string | null };

export type InboxItem = {
  id: string; role: "buyer" | "seller"; counterpart: { name: string; verified: boolean; avatar: string | null };
  regarding: string | null; lastMessage: string | null; lastFromMe: boolean; lastAt: string | null; unread: boolean;
};

const CONV_SELECT =
  "id, buyer_id, business_id, last_message_at, buyer_last_read_at, seller_last_read_at, " +
  "business:businesses(name, slug, verified, logo_url, owner_id), buyer:public_profiles!conversations_buyer_id_fkey(full_name, cu_verified), " +
  "product:products(id, title, slug, price_kobo, images:product_images(path, position)), order:orders(id, number, status)";

type ConvRow = {
  id: string; buyer_id: string; business_id: string; last_message_at: string | null; buyer_last_read_at: string | null; seller_last_read_at: string | null;
  business: { name: string; slug: string; verified: boolean; logo_url: string | null; owner_id: string };
  buyer: { full_name: string; cu_verified: boolean } | null;
  product: { id: string; title: string; slug: string; price_kobo: number; images: { path: string; position: number }[] } | null;
  order: { id: string; number: number; status: OrderStatus } | null;
};

const isUnread = (lastAt: string | null, readAt: string | null) => !!lastAt && (!readAt || lastAt > readAt);

export async function getInbox(viewer: Viewer): Promise<InboxItem[]> {
  const supabase = await createClient();
  const filter = viewer.businessId ? `buyer_id.eq.${viewer.id},business_id.eq.${viewer.businessId}` : `buyer_id.eq.${viewer.id}`;
  const { data, error } = await supabase
    .from("conversations")
    .select(`${CONV_SELECT}, messages(body, created_at, sender_id)`)
    .or(filter)
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" })
    .limit(100);
  if (error) throw error;
  return (data as unknown as (ConvRow & { messages: { body: string; created_at: string; sender_id: string }[] })[]).map((c) => {
    const role = c.buyer_id === viewer.id ? "buyer" : "seller";
    const last = c.messages[0];
    return {
      id: c.id,
      role,
      counterpart:
        role === "buyer"
          ? { name: c.business.name, verified: c.business.verified, avatar: mediaUrl(c.business.logo_url) }
          : { name: shortName(c.buyer?.full_name ?? ""), verified: !!c.buyer?.cu_verified, avatar: null },
      regarding: c.order ? `Order #${c.order.number}` : c.product?.title ?? null,
      lastMessage: last?.body ?? null,
      lastFromMe: last?.sender_id === viewer.id,
      lastAt: c.last_message_at,
      unread: last?.sender_id !== viewer.id && isUnread(c.last_message_at, role === "buyer" ? c.buyer_last_read_at : c.seller_last_read_at),
    };
  });
}

export async function countUnreadConversations(viewer: Viewer): Promise<number> {
  return (await getInbox(viewer)).filter((c) => c.unread).length;
}

export type Thread = {
  id: string; role: "buyer" | "seller"; viewerId: string;
  counterpart: { name: string; verified: boolean; avatar: string | null; href: string | null };
  product: { id: string; title: string; slug: string; price_kobo: number; image: string | null } | null;
  order: { id: string; number: number; status: OrderStatus; href: string } | null;
  messages: Message[];
};

export async function getThread(id: string, viewer: Viewer): Promise<Thread | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("conversations").select(CONV_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const c = data as unknown as ConvRow;
  const role = c.buyer_id === viewer.id ? "buyer" : c.business.owner_id === viewer.id ? "seller" : null;
  if (!role) return null; // admins can read via RLS but don't use the inbox
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, product_id, order_id")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(300);
  const img = c.product ? [...c.product.images].sort((a, b) => a.position - b.position)[0] : null;
  return {
    id: c.id,
    role,
    viewerId: viewer.id,
    counterpart:
      role === "buyer"
        ? { name: c.business.name, verified: c.business.verified, avatar: mediaUrl(c.business.logo_url), href: `/b/${c.business.slug}` }
        : { name: shortName(c.buyer?.full_name ?? ""), verified: !!c.buyer?.cu_verified, avatar: null, href: null },
    product: c.product ? { id: c.product.id, title: c.product.title, slug: c.product.slug, price_kobo: c.product.price_kobo, image: imageUrl(img?.path) } : null,
    order: c.order ? { ...c.order, href: role === "buyer" ? `/orders/${c.order.id}` : `/sell/orders/${c.order.id}` } : null,
    messages: (messages ?? []) as Message[],
  };
}
