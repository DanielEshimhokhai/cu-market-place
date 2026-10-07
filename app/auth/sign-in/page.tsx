import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeNext } from "@/lib/redirects";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/auth/sign-in">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/");
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Use your Covenant University email.</p>
      <SignInForm next={next} linkError={sp.error === "link"} />
    </>
  );
}
