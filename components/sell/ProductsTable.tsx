"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { deleteProduct, duplicateProduct, setProductStatus } from "@/lib/actions/products";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import type { SellerProductRow } from "@/lib/queries/seller";

type Filter = "all" | "active" | "paused" | "draft" | "removed";
const STATUS: Record<SellerProductRow["status"], { label: string; tone: BadgeTone }> = {
  active: { label: "Live", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  removed: { label: "Removed by moderators", tone: "danger" },
};

function StockCell({ p }: { p: SellerProductRow }) {
  if (p.kind === "service" || p.stock === null) return <span className="text-faint">—</span>;
  if (p.stock === 0) return <span className="font-medium text-danger">Sold out</span>;
  return <span className={cn("tabular", p.stock <= 3 && "font-medium text-warning")}>{p.stock}</span>;
}

export function ProductsTable({ products }: { products: SellerProductRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<SellerProductRow | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: products.length, active: 0, paused: 0, draft: 0, removed: 0 };
    products.forEach((p) => (c[p.status] += 1));
    return c;
  }, [products]);
  const visible = products.filter((p) => (filter === "all" || p.status === filter) && p.title.toLowerCase().includes(q.trim().toLowerCase()));

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; id?: string }>, after?: (r: { id?: string }) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.show(r.error ?? "Something went wrong.", { tone: "danger" });
      else {
        if (r.message) toast.show(r.message);
        after?.(r);
        router.refresh();
      }
    });

  const menu = (p: SellerProductRow): DropdownItem[] =>
    p.status === "removed"
      ? [{ label: "View listing", href: `/p/${p.slug}` }]
      : [
          { label: "Edit", href: `/sell/products/${p.id}` },
          p.status === "active"
            ? { label: "Pause", onSelect: () => run(() => setProductStatus(p.id, "paused")) }
            : { label: p.status === "draft" ? "Publish" : "Make live", onSelect: () => run(() => setProductStatus(p.id, "active")) },
          { label: "Duplicate", onSelect: () => run(() => duplicateProduct(p.id), (r) => r.id && router.push(`/sell/products/${r.id}`)) },
          { label: "View listing", href: `/p/${p.slug}` },
          { label: "Delete", danger: true, onSelect: () => setConfirmDelete(p) },
        ];

  return (
    <div className={cn(pending && "opacity-70 transition-opacity")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(["all", "active", "paused", "draft", "removed"] as const)
            .filter((f) => f === "all" || counts[f] > 0)
            .map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-[13px]", filter === f ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-subtle")}
              >
                {{ all: "All", active: "Live", paused: "Paused", draft: "Drafts", removed: "Removed" }[f]} <span className="tabular text-faint">{counts[f]}</span>
              </button>
            ))}
        </div>
        <div className="relative sm:w-60">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" aria-hidden />
          <Input aria-label="Search your listings" placeholder="Search listings" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-8" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line-strong p-6 text-sm text-muted">No listings match.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="hidden border-b border-line text-left text-xs text-muted md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Listing</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Views</th>
                <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                <th className="w-12 px-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) => (
                <tr key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 md:table-row md:p-0">
                  <td className="flex min-w-0 flex-1 basis-full items-center gap-3 md:table-cell md:px-4 md:py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-control bg-subtle">
                        {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <Link href={p.status === "removed" ? `/p/${p.slug}` : `/sell/products/${p.id}`} className="line-clamp-2 font-medium text-ink hover:underline">
                        {p.title}
                      </Link>
                    </div>
                  </td>
                  <td className="tabular md:px-3 md:py-2.5 md:text-right">{formatNaira(p.price_kobo)}</td>
                  <td className="text-xs md:px-3 md:py-2.5 md:text-right md:text-sm">
                    <span className="text-muted md:hidden">Stock </span>
                    <StockCell p={p} />
                  </td>
                  <td className="md:px-3 md:py-2.5"><Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge></td>
                  <td className="tabular text-xs text-muted md:px-3 md:py-2.5 md:text-right md:text-sm md:text-ink">
                    {p.view_count}<span className="md:hidden"> views</span>
                  </td>
                  <td className="tabular text-xs text-muted md:px-3 md:py-2.5 md:text-right md:text-sm md:text-ink">
                    {p.order_count}<span className="md:hidden"> orders</span>
                  </td>
                  <td className="ml-auto md:px-2 md:py-2.5">
                    <Dropdown label={`Actions for ${p.title}`} trigger={<span className="inline-flex size-8 items-center justify-center rounded-control text-muted hover:bg-subtle hover:text-ink"><MoreHorizontal size={18} /></span>} items={menu(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.title ?? ""}”?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Keep it</Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                const target = confirmDelete;
                setConfirmDelete(null);
                if (target) run(() => deleteProduct(target.id));
              }}
            >
              Delete listing
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          The listing and its photos are removed. Past orders keep their details. If you might sell it again, pause it instead.
        </p>
      </Modal>
    </div>
  );
}
