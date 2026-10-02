import { SellerNav } from "@/components/sell/SellerNav";
import { requireSeller } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();
  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", seller.businessId)
    .in("status", ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"]);

  return (
    <div className="pt-4 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:pt-10">
      <aside className="md:sticky md:top-24 md:self-start">
        <SellerNav storeSlug={seller.businessSlug} openOrders={count ?? 0} />
      </aside>
      <div className="min-w-0 pt-6 md:pt-0">{children}</div>
    </div>
  );
}
