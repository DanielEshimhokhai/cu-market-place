"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateProfile } from "@/lib/actions/account";
import type { ActionResult } from "@/lib/actions/result";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const toast = useToast();
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state?.ok && state.message) toast.show(state.message);
  }, [state, toast]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" defaultValue={fullName} maxLength={60} autoComplete="name" />
      </Field>
      <Field label="Phone number" htmlFor="phone" optional error={errors.phone} hint="Never shown publicly.">
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" loading={pending}>Save profile</Button>
      </div>
    </form>
  );
}
