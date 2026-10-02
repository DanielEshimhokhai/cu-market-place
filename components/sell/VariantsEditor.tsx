"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

export type VariantRow = { name: string; value: string; stock: string; delta: string };

const QUICK = {
  "Shoe sizes": ["40", "41", "42", "43", "44", "45"].map((value) => ({ name: "Size", value })),
  "Clothing sizes": ["S", "M", "L", "XL", "XXL"].map((value) => ({ name: "Size", value })),
};

export function VariantsEditor({ initial, error, onChange }: { initial: VariantRow[]; error?: string; onChange?: () => void }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const update = (next: VariantRow[]) => {
    setRows(next);
    onChange?.();
  };
  const set = (i: number, patch: Partial<VariantRow>) => update(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const payload = rows.filter((r) => r.name.trim() || r.value.trim());

  return (
    <div>
      <input type="hidden" name="variants" value={JSON.stringify(payload)} />
      {rows.length > 0 && (
        <div className="mb-2 overflow-hidden rounded-card border border-line bg-surface">
          <div className="hidden grid-cols-[1fr_1fr_88px_104px_36px] gap-2 border-b border-line px-3 py-2 text-xs text-muted sm:grid">
            <span>Option</span><span>Value</span><span>Stock</span><span>Extra price (₦)</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-b border-line px-3 py-2 last:border-b-0 sm:grid-cols-[1fr_1fr_88px_104px_36px]">
              <Input aria-label="Option name" placeholder="Size" value={r.name} onChange={(e) => set(i, { name: e.target.value })} className="h-9" />
              <Input aria-label="Option value" placeholder="42" value={r.value} onChange={(e) => set(i, { value: e.target.value })} className="h-9" />
              <Input aria-label="Stock for this option" inputMode="numeric" placeholder="Stock" value={r.stock} onChange={(e) => set(i, { stock: e.target.value })} className="h-9" />
              <Input aria-label="Extra price" inputMode="numeric" placeholder="0" value={r.delta} onChange={(e) => set(i, { delta: e.target.value })} className="h-9" />
              <button type="button" aria-label="Remove option" onClick={() => update(rows.filter((_, j) => j !== i))} className="inline-flex h-9 items-center justify-center text-muted hover:text-danger">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => update([...rows, { name: rows.at(-1)?.name ?? "Size", value: "", stock: "", delta: "" }])} className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[13px] hover:bg-subtle">
          <Plus size={14} /> Add option
        </button>
        {Object.entries(QUICK).map(([label, preset]) => (
          <button key={label} type="button" onClick={() => update([...rows, ...preset.filter((p) => !rows.some((r) => r.name === p.name && r.value === p.value)).map((p) => ({ ...p, stock: "", delta: "" }))])} className="rounded-control px-2.5 py-1.5 text-[13px] text-muted hover:bg-subtle hover:text-ink">
            + {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">Leave stock empty if you don&apos;t track it per option. Extra price is added to the base price.</p>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
