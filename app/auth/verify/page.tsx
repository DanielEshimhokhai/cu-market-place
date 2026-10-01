import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendButton } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <>
      <MailCheck size={22} strokeWidth={1.75} className="mb-4 text-accent" aria-hidden />
      <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        We sent a confirmation link to {email ? <span className="font-medium text-ink">{email}</span> : "your CU email"}. Open it on this
        device to finish creating your account. It can take a minute to arrive, and school mail sometimes files it under spam.
      </p>
      {email && (
        <div className="mt-6">
          <ResendButton email={email} />
        </div>
      )}
      <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
        Wrong email?{" "}
        <Link href="/auth/sign-up" className="font-medium text-accent hover:underline">
          Start again
        </Link>
      </p>
    </>
  );
}
