import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailWarning } from "lucide-react";
import { BusinessForm } from "@/components/sell/BusinessForm";
import { requireViewer } from "@/lib/auth";
import { getCategories, getLocations } from "@/lib/queries/reference";

export const metadata: Metadata = { title: "Start selling" };

export default async function OnboardingPage() {
  const viewer = await requireViewer("/sell/onboarding");
  if (viewer.businessId) redirect("/sell");
  const [categories, locations] = await Promise.all([getCategories(), getLocations()]);

  return (
    <div className="mx-auto max-w-[680px] pt-6 md:pt-10">
      <h1 className="text-[22px] font-semibold tracking-tight">Start selling on campus</h1>
      <p className="mt-1 mb-8 text-[15px] text-muted">
        Set up your store in a couple of minutes. It&apos;s free. Buyers pay you directly on pickup or delivery.
      </p>
      {!viewer.cuVerified && (
        <p className="mb-6 flex gap-2 rounded-card border border-warning/30 bg-warning-soft p-4 text-sm text-ink">
          <MailWarning size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          Confirm your CU email to sell. Check your inbox for the confirmation link we sent when you signed up.
        </p>
      )}
      <BusinessForm mode="create" categories={categories} locations={locations} />
    </div>
  );
}
