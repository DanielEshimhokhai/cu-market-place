"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Clock, Search, Store, Tag, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { normalizeQuery } from "@/lib/search";
import { clearRecent, getRecent, POPULAR_SEARCHES, pushRecent } from "@/lib/recent-searches";
import type { Suggestions } from "@/lib/queries/search";

type Option = { key: string; href: string; group: string; render: React.ReactNode };

const EMPTY: Suggestions = { products: [], businesses: [], categories: [] };

export function SearchBar({ size = "md", defaultValue = "", autoFocus = false }: { size?: "md" | "lg"; defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<Suggestions>(EMPTY);
  const [recent, setRecent] = useState<string[]>([]);
  const q = normalizeQuery(value);

  useEffect(() => setValue(defaultValue), [defaultValue]);

  // Debounced fetch; the previous request is aborted when the query changes.
  useEffect(() => {
    if (!q) {
      setResults(EMPTY);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        // aborted or offline: keep the previous suggestions
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = useMemo<Option[]>(() => {
    if (!q) {
      return [
        ...recent.map((r) => ({ key: `r:${r}`, group: "Recent", href: `/search?q=${encodeURIComponent(r)}`, render: <Row icon={Clock} label={r} /> })),
        ...POPULAR_SEARCHES.slice(0, recent.length ? 4 : 8).map((p) => ({
          key: `p:${p}`, group: "Popular", href: `/search?q=${encodeURIComponent(p)}`, render: <Row icon={TrendingUp} label={p} />,
        })),
      ];
    }
    return [
      ...results.products.map((p) => ({
        key: `prod:${p.slug}`, group: "Products", href: `/p/${p.slug}`,
        render: (
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative size-9 shrink-0 overflow-hidden rounded-[5px] bg-subtle">
              {p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{p.title}</span>
              <span className="block truncate text-xs text-muted">{p.business}</span>
            </span>
            <span className="tabular shrink-0 text-sm font-medium text-ink">{formatNaira(p.price_kobo)}</span>
          </span>
        ),
      })),
      ...results.businesses.map((b) => ({
        key: `biz:${b.slug}`, group: "Businesses", href: `/b/${b.slug}`, render: <Row icon={Store} label={b.name} meta={b.category ?? undefined} />,
      })),
      ...results.categories.map((c) => ({
        key: `cat:${c.slug}`, group: "Categories", href: `/browse?category=${c.slug}`, render: <Row icon={Tag} label={c.name} />,
      })),
      { key: "all", group: "", href: `/search?q=${encodeURIComponent(q)}`, render: <Row icon={Search} label={`Search for “${q}”`} strong /> },
    ];
  }, [q, recent, results]);

  const go = (href: string, term?: string) => {
    if (term) pushRecent(term);
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % Math.max(options.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[active];
      if (open && opt) go(opt.href, q || opt.key.slice(2));
      else if (q) go(`/search?q=${encodeURIComponent(q)}`, q);
    }
  };

  let lastGroup = "";
  return (
    <div ref={rootRef} className="relative">
      <form
        role="search"
        action="/search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q) go(`/search?q=${encodeURIComponent(q)}`, q);
        }}
      >
        <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" aria-hidden />
        <input
          ref={inputRef}
          name="q"
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search products, services or businesses"
          placeholder="Search products, services or businesses…"
          onFocus={() => {
            setRecent(getRecent());
            setOpen(true);
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-control border border-line bg-canvas pr-9 pl-9 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-faint focus:border-ink focus:bg-surface [&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "h-12 text-[15px]" : "h-10",
          )}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-faint hover:text-ink"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </form>

      {open && options.length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[70vh] overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-overlay">
          {!q && recent.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearRecent();
                setRecent([]);
              }}
              className="float-right px-2 py-1.5 text-xs text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
          <ul id={listId} role="listbox" aria-label="Search suggestions">
            {options.map((opt, i) => {
              const header = opt.group && opt.group !== lastGroup ? opt.group : null;
              lastGroup = opt.group;
              return (
                <li key={opt.key} role="presentation">
                  {header && <p className="px-2 pt-2 pb-1 text-xs font-medium text-faint">{header}</p>}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(opt.href, q || opt.key.slice(2))}
                    onMouseEnter={() => setActive(i)}
                    className={cn("cursor-pointer rounded-[5px] px-2 py-1.5", i === active && "bg-subtle", opt.key === "all" && "mt-1 border-t border-line pt-2")}
                  >
                    {opt.render}
                  </div>
                </li>
              );
            })}
          </ul>
          {q && !results.products.length && !results.businesses.length && !results.categories.length && (
            <p className="px-2 pb-1 text-xs text-muted">No quick matches. Press Enter to search everything.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, meta, strong }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string; meta?: string; strong?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3 text-sm">
      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-faint" />
      <span className={cn("truncate", strong ? "font-medium text-ink" : "text-ink")}>{label}</span>
      {meta && <span className="ml-auto shrink-0 text-xs text-muted">{meta}</span>}
    </span>
  );
}
