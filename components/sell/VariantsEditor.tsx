"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

export type VariantRow = { name: string; value: string; stock: string; delta: string };
type Row = Omit<VariantRow, "name">;

const QUICK: Record<string, { name: string; values: string[] }> = {
  "Shoe sizes": { name: "Size", values: ["40", "41", "42", "43", "44", "45"] },
  "Clothing sizes": { name: "Size", values: ["S", "M", "L", "XL", "XXL"] },
};

/** One option type per listing (e.g. Size), with a value, optional stock and extra price per row. */
export function VariantsEditor({ initial, error, onChange }: { initial: VariantRow[]; error?: string; onChange?: () => void }) {
  const [name, setName] = useState(initial[0]?.name ?? "Size");
  const [rows, setRows] = useState<Row[]>(initial.map(({ value, stock, delta }) => ({ value, stock, delta })));
  const update = (next: Row[]) => {
    setRows(next);
    onChange?.();
  };
  const set = (i: number, patch: Partial<Row>) => update(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const payload = rows.filter((r) => r.value.trim()).map((r) => ({ ...r, name: name.trim() || "Option" }));

  return (
    <div>
      <input type="hidden" name="variants" value={JSON.stringify(payload)} />
      {rows.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <label htmlFor="variant-name" className="text-[13px] text-muted">Option</label>
            <Input id="variant-name" value={name} maxLength={30} onChange={(e) => { setName(e.target.value); onChange?.(); }} placeholder="Size" className="h-9 w-40" />
          </div>
          <div className="mb-2 overflow-hidden rounded-card border border-line bg-surface">
            <div className="hidden grid-cols-[1fr_96px_120px_36px] gap-2 border-b border-line px-3 py-2 text-xs text-muted sm:grid">
              <span>{name || "Value"}</span><span>Stock</span><span>Extra price (₦)</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_36px] gap-2 border-b border-line px-3 py-2 last:border-b-0 sm:grid-cols-[1fr_96px_120px_36px]">
                <Input aria-label={`${name || "Option"} value`} placeholder="42" value={r.value} onChange={(e) => set(i, { value: e.target.value })} className="col-span-2 h-9 sm:col-span-1" />
                <Input aria-label="Stock for this option" inputMode="numeric" placeholder="Stock" value={r.stock} onChange={(e) => set(i, { stock: e.target.value })} className="h-9" />
                <Input aria-label="Extra price" inputMode="numeric" placeholder="0" value={r.delta} onChange={(e) => set(i, { delta: e.target.value })} className="h-9" />
                <button type="button" aria-label="Remove option" onClick={() => update(rows.filter((_, j) => j !== i))} className="inline-flex h-9 items-center justify-center text-muted hover:text-danger">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => update([...rows, { value: "", stock: "", delta: "" }])} className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[13px] hover:bg-subtle">
          <Plus size={14} /> Add option
        </button>
        {Object.entries(QUICK).map(([label, preset]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setName(preset.name);
              update([...rows, ...preset.values.filter((v) => !rows.some((r) => r.value === v)).map((value) => ({ value, stock: "", delta: "" }))]);
            }}
            className="rounded-control px-2.5 py-1.5 text-[13px] text-muted hover:bg-subtle hover:text-ink"
          >
            + {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">One option type per listing. Leave stock empty if you don&apos;t track it per option.</p>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
