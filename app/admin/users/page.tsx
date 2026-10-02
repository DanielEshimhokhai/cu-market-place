import type { Metadata } from "next";
import { ActionButton, Pagination } from "@/components/admin/AdminUi";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { setUserRole } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getAdminUsers } from "@/lib/queries/admin";
import { formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await getAdminUsers(q, page);

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight">Users</h1>
      <form className="mt-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="h-9 max-w-xs" />
        <button className="h-9 rounded-control border border-line bg-surface px-3 text-sm hover:bg-subtle">Search</button>
      </form>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {items.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.full_name || "No name"}</p>
              <p className="truncate text-xs text-muted">
                {u.email} · {u.affiliation} · joined {formatRelative(u.created_at)}
                {u.is_demo && " · demo"}
              </p>
            </div>
            <Badge tone={u.cu_verified ? "success" : "warning"}>{u.cu_verified ? "Verified" : "Unverified"}</Badge>
            {u.role === "admin" && <Badge tone="accent">Admin</Badge>}
            {u.id !== me.id &&
              (u.role === "admin" ? (
                <ActionButton label="Remove admin" variant="ghost" action={setUserRole.bind(null, u.id, "student")} confirm={{ title: "Remove admin access?", body: `${u.full_name} will lose access to the moderation console.`, cta: "Remove admin" }} />
              ) : (
                <ActionButton label="Make admin" action={setUserRole.bind(null, u.id, "admin")} confirm={{ title: "Give admin access?", body: `${u.full_name} will be able to moderate listings, sellers, users and reviews.`, cta: "Make admin" }} />
              ))}
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-sm text-muted">No users match.</li>}
      </ul>
      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(n) => `/admin/users?q=${encodeURIComponent(q)}&page=${n}`} />
    </div>
  );
}
