"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DropdownItem = { label: string; href?: string; onSelect?: () => void; danger?: boolean };

type Props = { trigger: ReactNode; label: string; items: DropdownItem[]; align?: "start" | "end"; header?: ReactNode };

export function Dropdown({ trigger, label, items, align = "end", header }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = (danger?: boolean) =>
    cn("block w-full rounded-[4px] px-2.5 py-2 text-left text-sm hover:bg-subtle", danger ? "text-danger" : "text-ink");

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-control"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-40 mt-1.5 min-w-52 rounded-card border border-line bg-surface p-1 shadow-overlay",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header && <div className="mb-1 border-b border-line px-2.5 pt-1.5 pb-2.5">{header}</div>}
          {items.map((item) =>
            item.href ? (
              <Link key={item.label} role="menuitem" href={item.href} className={itemClass(item.danger)} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                className={itemClass(item.danger)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
