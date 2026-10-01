import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/PasswordForms";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  if (!(await getViewer())) redirect("/auth/reset");
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted">You&apos;ll stay signed in on this device.</p>
      <UpdatePasswordForm />
    </>
  );
}
