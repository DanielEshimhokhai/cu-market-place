import Link from "next/link";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { InboxItem } from "@/lib/queries/messages";
import { formatRelative } from "@/lib/time";

export function ConversationList({ items, activeId }: { items: InboxItem[]; activeId?: string }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            aria-current={c.id === activeId ? "page" : undefined}
            className={cn("flex gap-3 px-4 py-3 hover:bg-subtle", c.id === activeId && "bg-subtle")}
          >
            <Avatar name={c.counterpart.name} src={c.counterpart.avatar} size={40} square={c.role === "buyer"} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1 text-sm">
                  <span className={cn("truncate", c.unread ? "font-semibold text-ink" : "font-medium text-ink")}>{c.counterpart.name}</span>
                  {c.counterpart.verified && <VerifiedBadge />}
                  {c.role === "seller" && <span className="shrink-0 rounded-[4px] bg-subtle px-1 text-[10px] text-muted">Buyer</span>}
                </p>
                {c.lastAt && <span className="shrink-0 text-[11px] text-faint">{formatRelative(c.lastAt)}</span>}
              </div>
              {c.regarding && <p className="truncate text-xs text-muted">Regarding: {c.regarding}</p>}
              <p className={cn("flex items-center gap-1.5 truncate text-[13px]", c.unread ? "text-ink" : "text-muted")}>
                {c.unread && <span aria-label="Unread" className="size-1.5 shrink-0 rounded-full bg-accent" />}
                <span className="truncate">{c.lastFromMe && "You: "}{c.lastMessage}</span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
