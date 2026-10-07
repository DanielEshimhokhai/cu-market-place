import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { OrderRow } from "@/components/market/OrderRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { requireSeller } from "@/lib/auth";
import type { OrderStatus } from "@/lib/orders/transitions";
import { getSellerOrders } from "@/lib/queries/orders";

export const metadata: Metadata = { title: "Seller orders" };

const TABS = {
  new: { label: "New", statuses: ["pending"] as OrderStatus[], empty: "No new orders right now." },
  progress: { label: "In progress", statuses: ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"] as OrderStatus[], empty: "Nothing in progress." },
  completed: { label: "Completed", statuses: ["completed"] as OrderStatus[], empty: "No completed orders yet." },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] as OrderStatus[], empty: "No cancelled orders." },
};
type TabId = keyof typeof TABS;

export default async function SellerOrdersPage({ searchParams }: PageProps<"/sell/orders">) {
  const seller = await requireSeller();
  const all = await getSellerOrders(seller.businessId, null);
  const counts = Object.fromEntries(Object.entries(TABS).map(([id, t]) => [id, all.filter((o) => t.statuses.includes(o.status)).length])) as Record<TabId, number>;
  const sp = await searchParams;
  const requested = (Object.keys(TABS) as TabId[]).find((t) => t === sp.tab);
  const tab: TabId = requested ?? (counts.new ? "new" : counts.progress ? "progress" : "completed");
  const orders = all.filter((o) => TABS[tab].statuses.includes(o.status));

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Orders</h1>
      <Tabs
        className="mt-4"
        active={tab}
        tabs={(Object.keys(TABS) as TabId[]).map((id) => ({ id, label: TABS[id].label, count: counts[id], href: `/sell/orders?tab=${id}` }))}
      />
      {orders.length ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {orders.map((o) => <OrderRow key={o.id} order={o} href={`/sell/orders/${o.id}`} perspective="seller" />)}
        </ul>
      ) : (
        <EmptyState className="mt-6" icon={Inbox} title={TABS[tab].empty} body="New orders appear here and in your notifications as soon as a buyer places them." />
      )}
    </div>
  );
}
