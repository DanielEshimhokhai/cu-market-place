import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ActionButton, Pagination } from "@/components/admin/AdminUi";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { resolveReport, setBusinessStatus, setListingStatus } from "@/lib/actions/admin";
import { ADMIN_PAGE_SIZE, getReports } from "@/lib/queries/admin";
import { formatRelative } from "@/lib/time";
import { REPORT_REASONS } from "@/lib/validation/report";

export const metadata: Metadata = { title: "Reports" };
const REASON = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const status = sp.status === "closed" || sp.status === "all" ? sp.status : "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getReports(status, page);

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Reports</h1>
      <Tabs
        className="mt-4"
        active={status}
        tabs={[
          { id: "open", label: "Needs attention", href: "/admin/reports" },
          { id: "closed", label: "Closed", href: "/admin/reports?status=closed" },
          { id: "all", label: "All", href: "/admin/reports?status=all" },
        ]}
      />
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.reason === "fraud" || r.reason === "harassment" ? "danger" : "warning"}>{REASON[r.reason] ?? r.reason}</Badge>
                <Badge tone={r.status === "open" ? "accent" : "neutral"}>{r.status}</Badge>
                <span className="text-xs text-muted">{r.target.type} · reported by {r.reporter} · {formatRelative(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm font-medium">
                {r.target.href ? <Link href={r.target.href} className="hover:underline">{r.target.label}</Link> : r.target.label}
              </p>
              {r.details && <p className="mt-1 text-sm whitespace-pre-line text-muted">{r.details}</p>}
              {r.resolution_note && <p className="mt-2 text-xs text-muted">Moderator note: {r.resolution_note}</p>}
              {(r.status === "open" || r.status === "reviewing") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "open" && <ActionButton label="Mark reviewing" action={resolveReport.bind(null, r.id, "reviewing")} />}
                  <ActionButton label="Resolve" variant="primary" action={resolveReport.bind(null, r.id, "resolved")} withNote="What did you do?" />
                  <ActionButton label="Dismiss" variant="ghost" action={resolveReport.bind(null, r.id, "dismissed")} withNote="Why is no action needed?" />
                  {r.target.productId && (
                    <ActionButton
                      label="Remove listing"
                      variant="danger"
                      action={setListingStatus.bind(null, r.target.productId, "removed")}
                      confirm={{ title: "Remove this listing?", body: "It's hidden from buyers immediately and the seller is notified. The seller can't relist it.", cta: "Remove listing" }}
                      withNote="Message to the seller"
                    />
                  )}
                  {r.target.businessId && (
                    <ActionButton
                      label="Suspend seller"
                      variant="danger"
                      action={setBusinessStatus.bind(null, r.target.businessId, "suspended")}
                      confirm={{ title: "Suspend this store?", body: "All its listings are hidden until you reactivate it. The seller is notified.", cta: "Suspend store" }}
                      withNote="Message to the seller"
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="mt-6" icon={ShieldCheck} title={status === "open" ? "No reports need attention." : "No reports here."} body="Reports from buyers and sellers show up here." />
      )}
      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(p) => `/admin/reports?status=${status}&page=${p}`} />
    </div>
  );
}
