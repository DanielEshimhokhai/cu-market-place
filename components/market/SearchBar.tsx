import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Plain search form. Replaced by the instant-search combobox in Task 13. */
export function SearchBar({ size = "md", defaultValue, autoFocus }: { size?: "md" | "lg"; defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="relative">
      <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" aria-hidden />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Search products, services or businesses…"
        aria-label="Search"
        className={cn(
          "w-full rounded-control border border-line bg-canvas pr-3 pl-9 text-sm text-ink placeholder:text-faint outline-none transition-colors duration-150 focus:border-ink focus:bg-surface",
          size === "lg" ? "h-12 text-[15px]" : "h-10",
        )}
      />
    </form>
  );
}
