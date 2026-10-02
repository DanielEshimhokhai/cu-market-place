"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

export function SellerNav({ storeSlug, openOrders }: { storeSlug: string; openOrders: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/sell", label: "Overview", active: pathname === "/sell" },
    { href: "/sell/orders", label: "Orders", count: openOrders, active: pathname.startsWith("/sell/orders") },
    { href: "/sell/products", label: "Products", active: pathname.startsWith("/sell/products") },
    { href: "/sell/settings", label: "Store settings", active: pathname.startsWith("/sell/settings") },
  ];
  return (
    <nav aria-label="Seller">
      <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:flex-col md:gap-0.5 md:border-0 md:px-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-between gap-3 text-sm transition-colors duration-150",
                "-mb-px border-b-2 px-2 md:mb-0 md:rounded-control md:border-b-0 md:px-3",
                item.active ? "border-accent font-medium text-ink md:bg-subtle" : "border-transparent text-muted hover:text-ink md:hover:bg-subtle",
              )}
            >
              {item.label}
              {!!item.count && <span className="tabular rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{item.count}</span>}
            </Link>
          </li>
        ))}
        <li className="shrink-0 md:mt-3 md:border-t md:border-line md:pt-3">
          <Link href={`/b/${storeSlug}`} className="flex h-10 items-center gap-1.5 px-2 text-sm text-muted hover:text-ink md:px-3">
            View storefront <ExternalLink size={13} aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
