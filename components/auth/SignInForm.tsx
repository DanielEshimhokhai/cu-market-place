"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendConfirmation, signIn, type AuthResult } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { FormError, FormNotice } from "./FormError";

export function SignInForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(signIn, null);
  const [resendMessage, setResendMessage] = useState<string>();
  const [resending, startResend] = useTransition();
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const unconfirmed = state && !state.ok ? state.unconfirmedEmail : undefined;

  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state && <FormError message="That link has expired or was already used. Sign in, or request a new link." />}
      <FormError message={state && !state.ok ? state.error : undefined} />
      {unconfirmed && (
        <div className="flex items-center justify-between gap-3">
          <FormNotice message={resendMessage} />
          {!resendMessage && (
            <Button
              variant="secondary"
              size="sm"
              loading={resending}
              onClick={() =>
                startResend(async () => {
                  const r = await resendConfirmation(unconfirmed);
                  setResendMessage(r.ok ? r.message : r.error);
                })
              }
            >
              Resend confirmation email
            </Button>
          )}
        </div>
      )}
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" defaultValue={state?.values?.email} autoComplete="email" placeholder="name@stu.cu.edu.ng" required />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/auth/reset" className="text-[13px] text-muted hover:text-ink">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
      <p className="border-t border-line pt-4 text-sm text-muted">
        New to CU Marketplace?{" "}
        <Link href="/auth/sign-up" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
