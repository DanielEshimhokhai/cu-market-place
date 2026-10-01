"use client";

import { useEffect, useState } from "react";
import { getCardsByIds } from "@/lib/actions/catalog";
import type { ProductCardData } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Section } from "./Section";

const KEY = "cu-recent-products";

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Records the current product and shows the others the viewer looked at recently (this device only). */
export function RecentlyViewed({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    const previous = read().filter((id) => id !== currentId);
    try {
      localStorage.setItem(KEY, JSON.stringify([currentId, ...previous].slice(0, 12)));
    } catch {
      // storage unavailable
    }
    if (previous.length) getCardsByIds(previous.slice(0, 10)).then(setItems).catch(() => setItems([]));
  }, [currentId]);

  if (!items.length) return null;
  return (
    <Section title="Recently viewed">
      <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:px-0">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} className="w-[44vw] shrink-0 snap-start sm:w-[200px]" />
        ))}
      </div>
    </Section>
  );
}
