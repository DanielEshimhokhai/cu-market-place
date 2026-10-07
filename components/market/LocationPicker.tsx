"use client";

import { useState, useTransition } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { BottomSheet } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { setLocationPref } from "@/lib/location-pref";
import type { Location } from "@/lib/types";

const ZONES: { zone: Location["zone"]; label: string }[] = [
  { zone: "hostels", label: "Halls of residence" },
  { zone: "central", label: "Central campus" },
  { zone: "academic", label: "Academic area" },
  { zone: "other", label: "Other" },
];

export function LocationPicker({ locations, current }: { locations: Location[]; current: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const currentName = locations.find((l) => l.slug === current)?.name;

  const choose = (slug: string | null) =>
    start(async () => {
      await setLocationPref(slug);
      setOpen(false);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink", pending && "opacity-60")}
      >
        <MapPin size={14} strokeWidth={1.75} aria-hidden />
        {currentName ? (
          <>
            near <span className="font-medium text-ink">{currentName}</span>
          </>
        ) : (
          "Set your hall"
        )}
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Where are you on campus?">
        <p className="mb-3 text-sm text-muted">We&apos;ll show businesses closest to you first. This stays on this device.</p>
        <div className="space-y-4">
          {ZONES.map(({ zone, label }) => {
            const list = locations.filter((l) => l.zone === zone);
            if (!list.length) return null;
            return (
              <div key={zone}>
                <p className="mb-1 text-xs font-medium text-faint">{label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map((l) => (
                    <button
                      key={l.slug}
                      type="button"
                      disabled={pending}
                      onClick={() => choose(l.slug)}
                      className={cn(
                        "rounded-control border px-3 py-2 text-left text-sm transition-colors duration-150",
                        l.slug === current ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-subtle",
                      )}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {current && (
            <button type="button" onClick={() => choose(null)} className="text-sm text-muted hover:text-ink">
              Clear location
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
