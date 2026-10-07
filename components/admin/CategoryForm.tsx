"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { saveCategory } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/result";

type Category = { id: string; name: string; kind: "product" | "service"; sort: number };

export function CategoryForm({ category, nextSort }: { category?: Category; nextSort?: number }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveCategory, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok && state.message) toast.show(state.message);
    if (state && !state.ok) toast.show(state.error ?? "Couldn't save.", { tone: "danger" });
  }, [state, toast]);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <Input name="name" defaultValue={category?.name} placeholder="New category" aria-label="Category name" className="h-9 w-44" required />
      <Select name="kind" defaultValue={category?.kind ?? "product"} aria-label="Kind" className="h-9 w-32">
        <option value="product">Product</option>
        <option value="service">Service</option>
      </Select>
      <Input name="sort" type="number" min={0} defaultValue={category?.sort ?? nextSort ?? 0} aria-label="Sort order" className="h-9 w-20" />
      <Button type="submit" size="sm" variant={category ? "secondary" : "primary"} loading={pending}>{category ? "Save" : "Add"}</Button>
    </form>
  );
}
