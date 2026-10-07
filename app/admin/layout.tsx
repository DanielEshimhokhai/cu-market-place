import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminUi";
import { ShopShell } from "@/components/layout/ShopShell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { template: "%s · Admin · CU Marketplace", default: "Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]);
  return (
    <ShopShell>
      <div className="pt-4 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:pt-10">
        <aside className="md:sticky md:top-24 md:self-start">
          <p className="mb-2 hidden px-3 text-xs font-semibold tracking-wide text-faint uppercase md:block">Moderation</p>
          <AdminNav openReports={count ?? 0} />
        </aside>
        <div className="min-w-0 pt-6 md:pt-0">{children}</div>
      </div>
    </ShopShell>
  );
}
