"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";

/** Server-rendered unread count, kept live by a realtime subscription to the viewer's own notifications. */
export function NotificationBell({ unread, userId }: { unread: number; userId: string }) {
  const [live, setLive] = useState({ base: unread, extra: 0 });
  const [flash, setFlash] = useState(false);
  // A fresh server count (navigation, refresh) replaces the live tally.
  if (live.base !== unread) setLive({ base: unread, extra: 0 });
  const count = unread + live.extra;

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        setLive((l) => ({ ...l, extra: l.extra + 1 }));
        setFlash(true);
        setTimeout(() => setFlash(false), 2000);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      className={cn("relative inline-flex size-9 items-center justify-center rounded-control text-ink transition-colors duration-150 hover:bg-subtle", flash && "bg-accent-soft")}
    >
      <Bell size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span className="tabular absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
