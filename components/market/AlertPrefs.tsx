"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { updateNotificationPrefs } from "@/lib/actions/saved";

export type Prefs = { notify_price_drop: boolean; notify_back_in_stock: boolean; notify_new_listings: boolean };

export function AlertPrefs({ initial, layout = "row" }: { initial: Prefs; layout?: "row" | "stack" }) {
  const [prefs, setPrefs] = useState(initial);
  const [, start] = useTransition();
  const toast = useToast();
  const toggle = (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    start(async () => {
      const r = await updateNotificationPrefs(next);
      if (!r.ok) {
        setPrefs(prefs);
        toast.show("Couldn't save your preference.", { tone: "danger" });
      }
    });
  };
  return (
    <div className={layout === "row" ? "flex flex-wrap gap-x-6 gap-y-1" : "flex flex-col gap-1"}>
      <Checkbox label="A saved item's price drops" checked={prefs.notify_price_drop} onChange={() => toggle("notify_price_drop")} />
      <Checkbox label="A saved item is back in stock" checked={prefs.notify_back_in_stock} onChange={() => toggle("notify_back_in_stock")} />
      <Checkbox label="A store I follow lists something new" checked={prefs.notify_new_listings} onChange={() => toggle("notify_new_listings")} />
    </div>
  );
}
