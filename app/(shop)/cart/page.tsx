import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const viewer = await getViewer();
  // Seller details for the group headers (verified mark, pickup area). Small table; fetched once.
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id, verified, location:locations(name)").eq("status", "active");
  const sellers = Object.fromEntries(
    ((data ?? []) as unknown as { id: string; verified: boolean; location: { name: string } | null }[]).map((b) => [
      b.id,
      { verified: b.verified, location: b.location?.name ?? null },
    ]),
  );
  return (
    <div className="pt-6 md:pt-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Cart</h1>
      <CartView viewer={{ signedIn: !!viewer, verified: !!viewer?.cuVerified, businessId: viewer?.businessId ?? null }} sellers={sellers} />
    </div>
  );
}
