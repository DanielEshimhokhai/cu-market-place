"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { submitReport } from "@/lib/actions/reports";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/cn";
import { REPORT_REASONS } from "@/lib/validation/report";

type Props = {
  targetType: "product" | "business" | "user" | "review";
  targetId: string;
  label: string;
  title?: string;
  signedIn: boolean;
  defaultDetails?: string;
  className?: string;
};

function ReportForm({ targetType, targetId, defaultDetails, onDone }: Pick<Props, "targetType" | "targetId" | "defaultDetails"> & { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReport, null);
  const [reason, setReason] = useState<string>("");
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  if (state?.ok) {
    return (
      <div className="space-y-4 py-2">
        <ShieldCheck size={22} strokeWidth={1.75} className="text-success" aria-hidden />
        <p className="text-sm text-ink">Thanks. Our moderators will review this.</p>
        <p className="text-sm text-muted">If you&apos;re in danger, contact campus security straight away.</p>
        <Button variant="secondary" onClick={onDone}>Close</Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">What&apos;s wrong?</legend>
        <div className="space-y-1.5">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-control border px-3 py-2 transition-colors duration-150",
                reason === r.value ? "border-accent bg-accent-soft" : "border-line hover:bg-subtle",
              )}
            >
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-1 size-4 accent-[#7A1F2B]" />
              <span>
                <span className="block text-sm font-medium text-ink">{r.label}</span>
                <span className="block text-xs text-muted">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.reason && <p role="alert" className="mt-1 text-xs text-danger">{errors.reason}</p>}
      </fieldset>
      <Field label="Details" htmlFor="report-details" optional={reason !== "other"} error={errors.details}>
        <Textarea id="report-details" name="details" rows={3} maxLength={1000} defaultValue={defaultDetails} placeholder="What happened? Include dates or order numbers if you have them." />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending} disabled={!reason}>Send report</Button>
      </div>
    </form>
  );
}

export function ReportDialog({ targetType, targetId, label, title = "Report a problem", signedIn, defaultDetails, className }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!signedIn) {
    return (
      <Link href={`/auth/sign-in?next=${encodeURIComponent(pathname)}`} className={cn("text-xs text-muted hover:text-ink", className)}>
        {label}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("text-xs text-muted hover:text-ink", className)}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} sheet>
        {open && <ReportForm targetType={targetType} targetId={targetId} defaultDetails={defaultDetails} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
