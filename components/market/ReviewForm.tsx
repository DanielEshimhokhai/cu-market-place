"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { submitReview } from "@/lib/actions/reviews";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/cn";
import { StarIcon } from "./Rating";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function StarInput({ name, label, value, onChange, size = "lg" }: { name: string; label: string; value: number; onChange: (n: number) => void; size?: "lg" | "sm" }) {
  return (
    <fieldset>
      <legend className={cn("mb-1", size === "lg" ? "text-[13px] font-medium" : "text-xs text-muted")}>{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" title={WORDS[n]}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <StarIcon
              filled={n <= value}
              className={cn(
                "transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
                size === "lg" ? "size-7" : "size-5",
                n <= value ? "text-ink" : "text-line-strong hover:text-muted",
              )}
            />
            <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
          </label>
        ))}
        {size === "lg" && value > 0 && <span className="ml-2 text-sm text-muted">{WORDS[value]}</span>}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ orderId, product }: { orderId: string; product: { id: string; title: string; image: string | null } }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [details, setDetails] = useState(false);
  const [aspects, setAspects] = useState({ quality: 0, communication: 0, accuracy: 0, fulfilment_rating: 0 });
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  if (state?.ok) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 text-sm">
        <CheckCircle2 size={18} className="text-success" aria-hidden />
        <span>Thanks — your review of <span className="font-medium">{product.title}</span> is live.</span>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-card border border-line bg-surface p-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="product_id" value={product.id} />
      <div className="flex items-center gap-3">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-control bg-subtle">
          {product.image && <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />}
        </span>
        <p className="text-sm font-medium">{product.title}</p>
      </div>
      <FormError message={state && !state.ok ? state.error : undefined} />
      <StarInput name="rating" label="Overall" value={rating} onChange={setRating} />
      {errors.rating && <p role="alert" className="text-xs text-danger">{errors.rating}</p>}

      <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className="text-[13px] text-muted hover:text-ink">
        {details ? "Hide details" : "Rate details (optional)"}
      </button>
      {details && (
        <div className="grid gap-3 sm:grid-cols-2">
          {([["quality", "Product quality"], ["communication", "Seller communication"], ["accuracy", "Matched the listing"], ["fulfilment_rating", "Pickup / delivery"]] as const).map(([key, label]) => (
            <StarInput key={key} name={key} label={label} size="sm" value={aspects[key]} onChange={(n) => setAspects((a) => ({ ...a, [key]: n }))} />
          ))}
        </div>
      )}

      <Field label="Your review" htmlFor={`body-${product.id}`} optional error={errors.body}>
        <Textarea id={`body-${product.id}`} name="body" rows={3} maxLength={1000} placeholder="What should other students know?" />
      </Field>
      <Button type="submit" loading={pending}>Post review</Button>
    </form>
  );
}
