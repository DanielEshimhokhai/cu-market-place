import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; count?: number; href: string };

export function Tabs({ tabs, active, className }: { tabs: TabItem[]; active: string; className?: string }) {
  return (
    <nav className={cn("no-scrollbar -mx-4 flex overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0", className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative -mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors duration-150 first:pl-0",
              isActive ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {typeof t.count === "number" && <span className="tabular text-xs text-faint">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
