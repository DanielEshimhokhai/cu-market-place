"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, LayoutGrid, Package, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/browse", label: "Browse", icon: LayoutGrid, match: (p: string) => /^\/(browse|search|businesses|b\/|locations)/.test(p) },
  { href: "/orders", label: "Orders", icon: Package, match: (p: string) => p.startsWith("/orders") },
  { href: "/saved", label: "Saved", icon: Bookmark, match: (p: string) => p.startsWith("/saved") },
  { href: "/account", label: "Profile", icon: User, match: (p: string) => /^\/(account|sell|messages|notifications)/.test(p) },
];

/** Routes with their own sticky bottom action bar hide the nav. */
const HIDDEN_ON = [/^\/p\//, /^\/cart$/, /^\/messages\/.+/];

export function MobileNav() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((r) => r.test(pathname))) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px]", active ? "text-accent" : "text-muted")}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
