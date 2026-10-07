import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/sell/StatTile";
import { getAdminSellers, getCounts, getReports } from "@/lib/queries/admin";
import { formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [c, reports, sellers] = await Promise.all([getCounts(), getReports("open"), getAdminSellers("unverified")]);
  return (
    <div className="space-y-8">
      <h1 className="text-[22px] font-semibold tracking-tight">Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Active buyers (30 days)" value={c.active_users_30d} detail={`${c.users} accounts`} href="/admin/users" />
        <StatTile label="Active sellers" value={c.sellers} detail={c.unverified_sellers ? `${c.unverified_sellers} unverified` : "All verified"} href="/admin/sellers" />
        <StatTile label="Live listings" value={c.listings} href="/admin/listings" />
        <StatTile label="Orders (30 days)" value={c.orders_30d} />
        <StatTile label="Reports needing attention" value={c.open_reports} href="/admin/reports" />
      </div>
      {c.demo_rows > 0 && (
        <p className="rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink">
          These numbers exclude demo data. {c.demo_rows} demo listings exist; run <code className="rounded bg-surface px-1">supabase/remove_demo.sql</code> before launch.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Open reports</h2>
            <Link href="/admin/reports" className="text-[13px] text-muted hover:text-ink">All reports</Link>
          </div>
          {reports.items.length ? (
            <ul className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
              {reports.items.slice(0, 5).map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <p className="font-medium capitalize">{r.reason.replace("_", " ")}</p>
                  <p className="truncate text-xs text-muted">{r.target.label} · {formatRelative(r.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-card border border-dashed border-line-strong p-5 text-sm text-muted">No open reports.</p>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Sellers waiting for verification</h2>
            <Link href="/admin/sellers?filter=unverified" className="text-[13px] text-muted hover:text-ink">All sellers</Link>
          </div>
          {sellers.items.length ? (
            <ul className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
              {sellers.items.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/b/${s.slug}`} className="truncate font-medium hover:underline">{s.name}</Link>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(s.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-card border border-dashed border-line-strong p-5 text-sm text-muted">Every active seller is verified.</p>
          )}
        </section>
      </div>
    </div>
  );
}
