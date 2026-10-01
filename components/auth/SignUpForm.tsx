"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthResult } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { FormError } from "./FormError";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(signUp, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const v = state?.values ?? {};
  const err = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" defaultValue={v.full_name} autoComplete="name" required {...err("full_name")} />
      </Field>
      <Field label="Covenant University email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" defaultValue={v.email} autoComplete="email" placeholder="name@stu.cu.edu.ng" required {...err("email")} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink">I&apos;m a</legend>
        <div className="flex gap-6">
          <Checkbox type="radio" name="affiliation" value="student" label="Student" defaultChecked={v.affiliation !== "staff"} />
          <Checkbox type="radio" name="affiliation" value="staff" label="Staff" defaultChecked={v.affiliation === "staff"} />
        </div>
        {errors.affiliation && <p className="mt-1 text-xs text-danger">{errors.affiliation}</p>}
      </fieldset>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required {...err("password")} />
      </Field>
      <Field label="Phone number" htmlFor="phone" optional error={errors.phone} hint="Used by sellers for pickup only.">
        <Input id="phone" name="phone" type="tel" defaultValue={v.phone} autoComplete="tel" placeholder="0803 123 4567" {...err("phone")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
      <p className="text-xs leading-5 text-muted">
        Only Covenant University email addresses can join. Your phone number is never shown publicly.
      </p>
      <p className="border-t border-line pt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
