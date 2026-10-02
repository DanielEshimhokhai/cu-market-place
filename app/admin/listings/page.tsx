import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ActionButton, Pagination } from "@/components/admin/AdminUi";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { setListingStatus } from "@/lib/actions/admin";
import { formatNaira } from "@/lib/money";
import { ADMIN_PAGE_SIZE, getAdminListings } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Listings" };

export default async function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const status = typeof sp.status === "string" ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getAdminListings(q, status, page);

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Listings</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search titles" aria-label="Search listings" className="h-9 max-w-xs" />
        <Select name="status" defaultValue={status} aria-label="Status" className="h-9 w-auto">
          <option value="all">All statuses</option>
          <option value="active">Live</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="removed">Removed</option>
        </Select>
        <button className="h-9 rounded-control border border-line bg-surface px-3 text-sm hover:bg-subtle">Filter</button>
      </form>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-control bg-subtle">
              {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/p/${p.slug}`} className="block truncate text-sm font-medium hover:underline">{p.title}</Link>
              <p className="truncate text-xs text-muted">
                {p.business?.name} · {formatNaira(p.price_kobo)} {p.is_demo && "· demo"}
              </p>
            </div>
            <Badge tone={p.status === "removed" ? "danger" : p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
            {p.status === "removed" ? (
              <ActionButton label="Restore" action={setListingStatus.bind(null, p.id, "active")} />
            ) : (
              <ActionButton
                label="Remove"
                variant="danger"
                action={setListingStatus.bind(null, p.id, "removed")}
                confirm={{ title: "Remove this listing?", body: "It's hidden from buyers and the seller is notified.", cta: "Remove listing" }}
                withNote="Message to the seller"
              />
            )}
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-sm text-muted">No listings match.</li>}
      </ul>
      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(n) => `/admin/listings?q=${encodeURIComponent(q)}&status=${status}&page=${n}`} />
    </div>
  );
}
