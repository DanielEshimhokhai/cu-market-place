"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { WEEKDAYS, type OpeningHours, type Weekday } from "@/lib/hours";
import { HOURS_PRESETS } from "@/lib/validation/business";

const LABEL: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
type PresetKey = keyof typeof HOURS_PRESETS | "custom";

function matchPreset(h: OpeningHours): PresetKey {
  const s = JSON.stringify(h);
  return (Object.keys(HOURS_PRESETS) as (keyof typeof HOURS_PRESETS)[]).find((k) => JSON.stringify(HOURS_PRESETS[k].hours) === s) ?? "custom";
}

/** Writes the chosen hours as JSON into a hidden input named `hours`. */
export function HoursEditor({ initial, error }: { initial: OpeningHours; error?: string }) {
  const [hours, setHours] = useState<OpeningHours>(initial);
  const [preset, setPreset] = useState<PresetKey>(() => matchPreset(initial));

  const setDay = (d: Weekday, ranges: [string, string][]) => setHours((h) => ({ ...h, [d]: ranges }));
  const pick = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") setHours(HOURS_PRESETS[key].hours);
  };

  return (
    <div>
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <div className="grid gap-2 sm:grid-cols-2">
        {([...Object.keys(HOURS_PRESETS), "custom"] as PresetKey[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={preset === key}
            onClick={() => pick(key)}
            className={cn(
              "rounded-control border px-3 py-2 text-left transition-colors duration-150",
              preset === key ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-subtle",
            )}
          >
            <span className={cn("block text-sm font-medium", preset === key ? "text-accent" : "text-ink")}>
              {key === "custom" ? "Custom" : HOURS_PRESETS[key].label}
            </span>
            <span className="block text-xs text-muted">{key === "custom" ? "Set each day yourself" : HOURS_PRESETS[key].hint}</span>
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {WEEKDAYS.map((d) => {
            const ranges = hours[d] ?? [];
            return (
              <div key={d} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="w-10 text-sm font-medium">{LABEL[d]}</span>
                {ranges.length === 0 && <span className="text-sm text-muted">Closed</span>}
                {ranges.map(([o, c], i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <input type="time" aria-label={`${LABEL[d]} opens`} value={o} onChange={(e) => setDay(d, ranges.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} className="h-8 rounded-control border border-line px-1.5 text-sm" />
                    <span className="text-faint">–</span>
                    <input type="time" aria-label={`${LABEL[d]} closes`} value={c} onChange={(e) => setDay(d, ranges.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} className="h-8 rounded-control border border-line px-1.5 text-sm" />
                    <button type="button" aria-label="Remove time range" onClick={() => setDay(d, ranges.filter((_, j) => j !== i))} className="inline-flex size-7 items-center justify-center text-muted hover:text-danger">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {ranges.length < 3 && (
                  <button type="button" onClick={() => setDay(d, [...ranges, ["09:00", "17:00"]])} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                    <Plus size={13} /> {ranges.length ? "Add hours" : "Open this day"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
