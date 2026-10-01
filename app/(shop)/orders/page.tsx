import type { Metadata } from "next";
import { CheckCircle2, Package } from "lucide-react";
import { OrderRow } from "@/components/market/OrderRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { requireViewer } from "@/lib/auth";
import { countMyOrders, getMyOrders, type OrderFilter } from "@/lib/queries/orders";

export const metadata: Metadata = { title: "Orders" };

const EMPTY: Record<OrderFilter, { title: string; body: string }> = {
  active: { title: "No orders in progress.", body: "Orders you place will show here until they're completed." },
  completed: { title: "No completed orders yet.", body: "Finished orders show here, ready for you to review." },
  cancelled: { title: "No cancelled orders.", body: "Good news: nothing has been cancelled." },
  all: { title: "No orders yet.", body: "Your purchases will appear here." },
};

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const viewer = await requireViewer("/orders");
  const sp = await searchParams;
  const counts = await countMyOrders(viewer.id);
  const requested = (["active", "completed", "cancelled", "all"] as const).find((t) => t === sp.tab);
  const tab: OrderFilter = requested ?? (counts.active ? "active" : "all");
  const orders = await getMyOrders(viewer.id, tab);
  const placed = typeof sp.placed === "string" ? sp.placed.split(",").filter((n) => /^\d+$/.test(n)) : [];
  const placedOrders = placed.length ? (await getMyOrders(viewer.id, "active")).filter((o) => placed.includes(String(o.number))) : [];

  return (
    <div className="pt-6 md:pt-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Orders</h1>

      {placedOrders.length > 0 && (
        <div className="mt-4 flex gap-3 rounded-card border border-success/25 bg-success-soft p-4 text-sm text-ink">
          <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium">
              {placedOrders.length === 1 ? "Order placed" : `${placedOrders.length} orders placed`}:{" "}
              {placedOrders.map((o) => `#${o.number} ${o.business.name}`).join(", ")}.
            </p>
            <p className="mt-0.5 text-muted">Sellers have been notified. You&apos;ll get an update when they confirm. Don&apos;t pay before then.</p>
          </div>
        </div>
      )}

      <Tabs
        className="mt-5"
        active={tab}
        tabs={[
          { id: "active", label: "In progress", count: counts.active, href: "/orders?tab=active" },
          { id: "completed", label: "Completed", count: counts.completed, href: "/orders?tab=completed" },
          { id: "cancelled", label: "Cancelled", count: counts.cancelled, href: "/orders?tab=cancelled" },
          { id: "all", label: "All", count: counts.all, href: "/orders?tab=all" },
        ]}
      />

      {orders.length ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {orders.map((o) => <OrderRow key={o.id} order={o} href={`/orders/${o.id}`} />)}
        </ul>
      ) : (
        <EmptyState className="mt-6" icon={Package} {...EMPTY[tab]} action={{ label: "Browse the marketplace", href: "/browse" }} />
      )}
    </div>
  );
}
