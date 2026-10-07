"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { FormError } from "@/components/auth/FormError";
import { Button, buttonClass } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { saveProduct, type ProductFormResult } from "@/lib/actions/products";
import { cn } from "@/lib/cn";
import type { EditableProduct } from "@/lib/queries/seller";
import type { Category, Location } from "@/lib/types";
import { ImageUploader } from "./ImageUploader";
import { VariantsEditor } from "./VariantsEditor";

const naira = (kobo: number | null | undefined) => (kobo === null || kobo === undefined ? "" : (kobo / 100).toLocaleString("en-NG"));

type Props = {
  businessId: string; categories: Category[]; locations: Location[]; defaultLocationId: string | null;
  product?: EditableProduct; offersDelivery: boolean;
};

export function ProductForm({ businessId, categories, locations, defaultLocationId, product, offersDelivery }: Props) {
  const [state, action, pending] = useActionState<ProductFormResult | null, FormData>(saveProduct, null);
  const v = state?.values;
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [kind, setKind] = useState<"product" | "service">((v?.kind as "product" | "service") ?? product?.kind ?? "product");
  const [unlimited, setUnlimited] = useState(v ? v.unlimited === "on" : product ? product.stock === null : false);
  const [pickup, setPickup] = useState(v ? v.allows_pickup === "on" : product?.allows_pickup ?? true);
  const [delivery, setDelivery] = useState(v ? v.allows_delivery === "on" : product?.allows_delivery ?? offersDelivery);
  const [description, setDescription] = useState(v?.description ?? product?.description ?? "");
  const dirty = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Scroll the first error into view after a failed save.
  useEffect(() => {
    if (state && !state.ok) {
      const first = formRef.current?.querySelector('[role="alert"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  const removed = product?.status === "removed";
  const markDirty = () => (dirty.current = true);
  const initialVariants = v?.variants
    ? (() => {
        try {
          return JSON.parse(v.variants);
        } catch {
          return [];
        }
      })()
    : product?.variants.map((x) => ({ name: x.name, value: x.value, stock: x.stock?.toString() ?? "", delta: x.price_delta_kobo ? naira(x.price_delta_kobo) : "" })) ?? [];

  return (
    <form
      ref={formRef}
      action={(fd) => {
        dirty.current = false;
        return action(fd);
      }}
      onChange={markDirty}
      className="max-w-[680px] space-y-8 pb-24"
      noValidate
    >
      {product && <input type="hidden" name="id" value={product.id} />}
      <FormError message={state && !state.ok ? state.error : undefined} />
      {removed && <FormError message="Moderators removed this listing. It can't be edited or relisted." />}

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Photos</h2>
        <ImageUploader businessId={businessId} initial={product?.images ?? []} error={errors.images} onChange={markDirty} />
      </section>

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Details</h2>
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input id="title" name="title" maxLength={90} defaultValue={v?.title ?? product?.title} placeholder="e.g. Nike Dunk Low “Panda”, size 42" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Type</legend>
          <div className="inline-flex rounded-control border border-line bg-surface p-0.5">
            {(["product", "service"] as const).map((k) => (
              <label key={k} className={cn("cursor-pointer rounded-[4px] px-3 py-1.5 text-sm", kind === k ? "bg-ink text-white" : "text-ink hover:bg-subtle")}>
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {k === "product" ? "Product" : "Service"}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Category" htmlFor="category_id" error={errors.category_id}>
          <Select id="category_id" name="category_id" defaultValue={v?.category_id ?? product?.category_id ?? ""}>
            <option value="" disabled>Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Description" htmlFor="description" optional error={errors.description} hint={`${description.length}/3000 · Condition details, sizes, what's included.`}>
          <Textarea id="description" name="description" maxLength={3000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Price</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₦)" htmlFor="price" error={errors.price}>
            <Input id="price" name="price" inputMode="decimal" defaultValue={v?.price ?? naira(product?.price_kobo)} placeholder="8,500" />
          </Field>
          <Field label="Original price (₦)" htmlFor="compare_at" optional error={errors.compare_at} hint="Shown struck through, only if higher.">
            <Input id="compare_at" name="compare_at" inputMode="decimal" defaultValue={v?.compare_at ?? naira(product?.compare_at_kobo)} />
          </Field>
        </div>
      </section>

      {kind === "product" && (
        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold">Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Condition" htmlFor="condition">
              <Select id="condition" name="condition" defaultValue={v?.condition ?? product?.condition ?? "new"}>
                <option value="new">New</option>
                <option value="like_new">Like new</option>
                <option value="used">Used</option>
              </Select>
            </Field>
            <Field label="Quantity in stock" htmlFor="stock" error={errors.stock}>
              <Input id="stock" name="stock" inputMode="numeric" disabled={unlimited} defaultValue={v?.stock ?? product?.stock?.toString() ?? "1"} />
            </Field>
          </div>
          <Checkbox name="unlimited" label="Made to order / I don't track stock" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
          <div>
            <p className="mb-2 text-[13px] font-medium">Options <span className="font-normal text-faint">(optional)</span></p>
            <VariantsEditor initial={initialVariants} error={errors.variants} onChange={markDirty} />
          </div>
        </section>
      )}
      {kind === "service" && <input type="hidden" name="stock" value="" />}

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Getting it to the buyer</h2>
        <Checkbox name="allows_pickup" label="Pickup" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
        {pickup && (
          <Field label="Pickup area" htmlFor="pickup_location_id" hint="General area only. Exact details are shared privately after an order.">
            <Select id="pickup_location_id" name="pickup_location_id" defaultValue={v?.pickup_location_id ?? product?.pickup_location_id ?? defaultLocationId ?? ""}>
              <option value="">Same as my store</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
        )}
        {!pickup && <input type="hidden" name="pickup_location_id" value="" />}
        <Checkbox name="allows_delivery" label="Delivery within campus" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
        {delivery && (
          <Field label="Delivery note" htmlFor="delivery_note" optional hint="e.g. ₦300 to any hall, same evening.">
            <Input id="delivery_note" name="delivery_note" maxLength={200} defaultValue={v?.delivery_note ?? product?.delivery_note ?? ""} />
          </Field>
        )}
        {errors.allows_pickup && <p role="alert" className="text-xs text-danger">{errors.allows_pickup}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">Visibility</h2>
        <div className="flex flex-col gap-1">
          <Checkbox type="radio" name="status" value="active" label="Publish now" defaultChecked={(v?.status ?? (product?.status === "active" || !product ? "active" : "draft")) === "active"} />
          <Checkbox type="radio" name="status" value="draft" label="Save as draft (only you can see it)" defaultChecked={(v?.status ?? (product && product.status !== "active" ? "draft" : "")) === "draft"} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface md:bottom-0">
        <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-2 px-4 py-3 md:px-6">
          <Link href="/sell/products" className={buttonClass("ghost", "md")}>Cancel</Link>
          <Button type="submit" loading={pending} disabled={removed}>{product ? "Save changes" : "Save listing"}</Button>
        </div>
      </div>
    </form>
  );
}
