import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, Pagination } from "@/components/admin/AdminUi";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { setBusinessStatus, setBusinessVerified } from "@/lib/actions/admin";
import { ADMIN_PAGE_SIZE, getAdminSellers } from "@/lib/queries/admin";
import { formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Sellers" };

export default async function AdminSellersPage({ searchParams }: PageProps<"/admin/sellers">) {
  const sp = await searchParams;
  const filter = sp.filter === "unverified" || sp.filter === "suspended" ? sp.filter : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getAdminSellers(filter, page);

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Sellers</h1>
      <Tabs
        className="mt-4"
        active={filter}
        tabs={[
          { id: "all", label: "All", href: "/admin/sellers" },
          { id: "unverified", label: "Unverified", href: "/admin/sellers?filter=unverified" },
          { id: "suspended", label: "Suspended", href: "/admin/sellers?filter=suspended" },
        ]}
      />
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium">
                <Link href={`/b/${s.slug}`} className="truncate hover:underline">{s.name}</Link>
                {s.verified && <VerifiedBadge />}
              </p>
              <p className="text-xs text-muted">
                {s.category?.name ?? "No category"} · {s.products[0]?.count ?? 0} listings · ★ {Number(s.rating_avg).toFixed(1)} ({s.rating_count}) · joined {formatRelative(s.created_at)}
                {s.is_demo && " · demo"}
              </p>
            </div>
            {s.status === "suspended" && <Badge tone="danger">Suspended</Badge>}
            {s.verified ? (
              <ActionButton label="Unverify" variant="ghost" action={setBusinessVerified.bind(null, s.id, false)} />
            ) : (
              <ActionButton label="Verify" variant="primary" action={setBusinessVerified.bind(null, s.id, true)} />
            )}
            {s.status === "active" ? (
              <ActionButton
                label="Suspend"
                variant="danger"
                action={setBusinessStatus.bind(null, s.id, "suspended")}
                confirm={{ title: `Suspend ${s.name}?`, body: "All its listings are hidden until reactivated. The seller is notified.", cta: "Suspend store" }}
                withNote="Message to the seller"
              />
            ) : (
              <ActionButton label="Reactivate" action={setBusinessStatus.bind(null, s.id, "active")} />
            )}
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-sm text-muted">No sellers here.</li>}
      </ul>
      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(n) => `/admin/sellers?filter=${filter}&page=${n}`} />
    </div>
  );
}
