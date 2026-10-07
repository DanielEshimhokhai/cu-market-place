"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { requestReset, resendConfirmation, updatePassword } from "@/app/auth/actions";
import type { ActionResult } from "@/lib/actions/result";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { FormError, FormNotice } from "./FormError";

export function ResetForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestReset, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormNotice message={state.message} />
        <Link href="/auth/sign-in" className="text-sm font-medium text-accent hover:underline">Back to sign in</Link>
      </div>
    );
  }
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Covenant University email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link</Button>
      <Link href="/auth/sign-in" className="block text-sm text-muted hover:text-ink">Back to sign in</Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updatePassword, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Update password</Button>
    </form>
  );
}

export function ResendButton({ email }: { email: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  if (message) return <FormNotice message={message} />;
  return (
    <Button variant="secondary" loading={pending} onClick={() => start(async () => {
      const r = await resendConfirmation(email);
      setMessage(r.ok ? r.message : r.error);
    })}>
      Resend email
    </Button>
  );
}
