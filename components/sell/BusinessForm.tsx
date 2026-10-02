"use client";

import { useActionState, useEffect, useState } from "react";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createBusiness, updateBusiness, type BusinessFormResult } from "@/lib/actions/business";
import type { OpeningHours } from "@/lib/hours";
import type { Category, Location } from "@/lib/types";
import { HOURS_PRESETS } from "@/lib/validation/business";
import { HoursEditor } from "./HoursEditor";

type Initial = {
  name: string; tagline: string; description: string; category_id: string; location_id: string; seller_type: "student" | "business";
  offers_delivery: boolean; delivery_note: string; hours: OpeningHours;
};

const ZONES: { zone: Location["zone"]; label: string }[] = [
  { zone: "hostels", label: "Halls of residence" },
  { zone: "central", label: "Central campus" },
  { zone: "academic", label: "Academic area" },
  { zone: "other", label: "Other" },
];

export function BusinessForm({ mode, categories, locations, initial }: { mode: "create" | "update"; categories: Category[]; locations: Location[]; initial?: Initial }) {
  const [state, action, pending] = useActionState<BusinessFormResult | null, FormData>(mode === "create" ? createBusiness : updateBusiness, null);
  const toast = useToast();
  const v = state?.values;
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [delivery, setDelivery] = useState(initial?.offers_delivery ?? false);

  useEffect(() => {
    if (state?.ok && state.message) toast.show(state.message);
  }, [state, toast]);

  const hours: OpeningHours = (() => {
    if (v?.hours) {
      try {
        return JSON.parse(v.hours);
      } catch {
        /* fall through */
      }
    }
    return initial?.hours ?? HOURS_PRESETS.student.hours;
  })();

  return (
    <form action={action} className="max-w-[680px] space-y-8" noValidate>
      <FormError message={state && !state.ok ? state.error : undefined} />

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Your store</h2>
        <Field label="Store name" htmlFor="name" error={errors.name} hint="This is what buyers see. You can change it later.">
          <Input id="name" name="name" required maxLength={60} defaultValue={v?.name ?? initial?.name} placeholder="e.g. Daniel's Closet" />
        </Field>
        <Field label="Tagline" htmlFor="tagline" optional error={errors.tagline} hint="One line about what you sell.">
          <Input id="tagline" name="tagline" maxLength={90} defaultValue={v?.tagline ?? initial?.tagline} placeholder="e.g. Clean streetwear and sneakers, checked before sale." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category_id" error={errors.category_id}>
            <Select id="category_id" name="category_id" defaultValue={v?.category_id ?? initial?.category_id ?? ""}>
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">You are a</legend>
            <div className="flex h-10 items-center gap-5">
              <Checkbox type="radio" name="seller_type" value="student" label="Student seller" defaultChecked={(v?.seller_type ?? initial?.seller_type ?? "student") === "student"} />
              <Checkbox type="radio" name="seller_type" value="business" label="Campus business" defaultChecked={(v?.seller_type ?? initial?.seller_type) === "business"} />
            </div>
          </fieldset>
        </div>
        <Field label="About" htmlFor="description" optional error={errors.description}>
          <Textarea id="description" name="description" maxLength={1500} rows={3} defaultValue={v?.description ?? initial?.description} placeholder="What you sell, how you work, anything buyers should know." />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Pickup and delivery</h2>
        <Field
          label="Pickup area"
          htmlFor="location_id"
          error={errors.location_id}
          hint="Choose a general area. Never share your room number here; you'll send exact pickup details privately per order."
        >
          <Select id="location_id" name="location_id" defaultValue={v?.location_id ?? initial?.location_id ?? ""}>
            <option value="" disabled>Choose an area</option>
            {ZONES.map(({ zone, label }) => (
              <optgroup key={zone} label={label}>
                {locations.filter((l) => l.zone === zone).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Checkbox name="offers_delivery" label="I can deliver within campus" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
        {delivery && (
          <Field label="Delivery note" htmlFor="delivery_note" optional error={errors.delivery_note} hint="Fee and where you deliver, e.g. ₦300 to any hall, 30–45 min.">
            <Input id="delivery_note" name="delivery_note" maxLength={200} defaultValue={v?.delivery_note ?? initial?.delivery_note} />
          </Field>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Opening hours</h2>
        <p className="text-sm text-muted">Buyers see whether you&apos;re open now. Times are Lagos time.</p>
        <HoursEditor initial={hours} error={errors.hours} />
      </section>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button type="submit" size="lg" loading={pending}>{mode === "create" ? "Create store" : "Save changes"}</Button>
      </div>
    </form>
  );
}
