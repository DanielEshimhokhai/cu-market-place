"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearRecent, getRecent } from "@/lib/recent-searches";

export function RecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(getRecent()), []);
  if (!recent.length) return null;
  return (
    <section className="pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-muted">Recent searches</h2>
        <button type="button" onClick={() => { clearRecent(); setRecent([]); }} className="text-xs text-muted hover:text-ink">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((r) => (
          <Link key={r} href={`/search?q=${encodeURIComponent(r)}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] hover:bg-subtle">
            {r}
          </Link>
        ))}
      </div>
    </section>
  );
}
