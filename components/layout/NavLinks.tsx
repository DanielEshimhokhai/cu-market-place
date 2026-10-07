"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/browse", label: "Marketplace", match: ["/browse", "/search", "/p/"] },
  { href: "/businesses", label: "Businesses", match: ["/businesses", "/b/", "/locations"] },
  { href: "/orders", label: "Orders", match: ["/orders"], auth: true },
  { href: "/saved", label: "Saved", match: ["/saved"], auth: true },
];

export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {LINKS.filter((l) => signedIn || !l.auth).map((l) => {
        const active = l.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-16 items-center px-2.5 text-sm transition-colors duration-150",
              active ? "text-ink after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-accent" : "text-muted hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
