"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, MessageSquare, Package, PackageCheck, ShieldAlert, Star, Store, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/queries/notifications";
import { formatRelative } from "@/lib/time";

const ICON: Record<string, LucideIcon> = {
  order_update: Package, message: MessageSquare, price_drop: TrendingDown, back_in_stock: PackageCheck,
  new_listing: Store, review: Star, review_reminder: Star, moderation: ShieldAlert,
};

function isToday(iso: string) {
  const key = (d: Date) => d.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" });
  return key(new Date(iso)) === key(new Date());
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const groups = [
    { label: "Today", items: items.filter((n) => isToday(n.created_at)) },
    { label: "Earlier", items: items.filter((n) => !isToday(n.created_at)) },
  ].filter((g) => g.items.length);
  const unread = items.some((n) => !n.read_at);

  return (
    <div>
      {unread && (
        <div className="mb-3 flex justify-end">
          <button type="button" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })} className="text-[13px] text-muted hover:text-ink">
            Mark all as read
          </button>
        </div>
      )}
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 text-[13px] font-semibold text-muted">{g.label}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {g.items.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          if (!n.read_at) await markNotificationRead(n.id);
                          if (n.href) router.push(n.href);
                          else router.refresh();
                        })
                      }
                      className="flex w-full gap-3 px-4 py-3 text-left hover:bg-subtle"
                    >
                      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
                        <Icon size={16} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("flex items-center gap-2 text-sm", n.read_at ? "text-ink" : "font-semibold text-ink")}>
                          {!n.read_at && <span aria-label="Unread" className="size-1.5 shrink-0 rounded-full bg-accent" />}
                          <span className="truncate">{n.title}</span>
                        </span>
                        {n.body && <span className="line-clamp-2 block text-[13px] text-muted">{n.body}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-faint">{formatRelative(n.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
