"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { updateOrderStatus } from "@/lib/actions/orders";
import { sellerNextStatuses, type Fulfilment, type OrderStatus } from "@/lib/orders/transitions";

const LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  preparing: "Start preparing",
  ready_for_pickup: "Mark ready for pickup",
  out_for_delivery: "Mark out for delivery",
  completed: "Mark completed",
};
const DONE: Partial<Record<OrderStatus, string>> = {
  confirmed: "Order confirmed. The buyer has been notified.",
  preparing: "Marked as preparing",
  ready_for_pickup: "Buyer notified that it's ready",
  out_for_delivery: "Buyer notified it's on the way",
  completed: "Order completed",
  cancelled: "Order cancelled",
};

type Props = { orderId: string; number: number; status: OrderStatus; fulfilment: Fulfilment; instructions: string | null };

export function OrderActions({ orderId, number, status, fulfilment, instructions }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [details, setDetails] = useState(instructions ?? "");
  const [detailsError, setDetailsError] = useState<string>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const next = sellerNextStatuses(status, fulfilment);
  const primary = next.filter((s) => s !== "cancelled");
  const canCancel = next.includes("cancelled");
  const showDetails = status !== "pending" && status !== "cancelled" && status !== "completed";
  const detailsLabel = fulfilment === "pickup" ? "Pickup details" : "Delivery details";

  const run = (to: OrderStatus, extra?: { instructions?: string; reason?: string }) =>
    start(async () => {
      const r = await updateOrderStatus({ orderId, status: to, ...extra });
      if (!r.ok) toast.show(r.error ?? "Something went wrong.", { tone: "danger" });
      else {
        toast.show(to === status ? "Details sent to the buyer" : DONE[to] ?? "Updated");
        setCancelOpen(false);
        router.refresh();
      }
    });

  const advance = (to: OrderStatus) => {
    // Buyers need to know where to collect before an order is marked ready.
    if (to === "ready_for_pickup" && !details.trim()) {
      setDetailsError("Add pickup details first so the buyer knows where to collect.");
      return;
    }
    run(to, details.trim() && details.trim() !== (instructions ?? "") ? { instructions: details.trim() } : undefined);
  };

  if (!next.length && !showDetails) return null;

  return (
    <div className="space-y-4">
      {showDetails && (
        <div className="rounded-card border border-line bg-surface p-4">
          <Field
            label={detailsLabel}
            htmlFor="instructions"
            error={detailsError}
            hint="Only this buyer sees this. Say exactly where and when, e.g. Daniel Hall reception, 6–8pm. Call when you arrive."
          >
            <Textarea
              id="instructions"
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                setDetailsError(undefined);
              }}
            />
          </Field>
          {details.trim() !== (instructions ?? "") && (
            <Button variant="secondary" size="sm" className="mt-2" loading={pending} disabled={!details.trim()} onClick={() => run(status, { instructions: details.trim() })}>
              Send details to buyer
            </Button>
          )}
        </div>
      )}

      {(primary.length > 0 || canCancel) && (
        <div className="flex flex-wrap gap-2">
          {primary.map((s, i) => (
            <Button key={s} variant={i === 0 ? "primary" : "secondary"} loading={pending} onClick={() => advance(s)}>
              {LABEL[s]}
            </Button>
          ))}
          {canCancel && <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
        </div>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel order #${number}?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button variant="danger" loading={pending} onClick={() => run("cancelled", { reason: reason.trim() || undefined })}>Cancel order</Button>
          </div>
        }
      >
        <p className="text-sm text-muted">The buyer is notified and the stock goes back to your listing.</p>
        <Field label="Reason for the buyer" htmlFor="seller-cancel-reason" optional className="mt-4">
          <Textarea id="seller-cancel-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sorry, that size just sold out." />
        </Field>
      </Modal>
    </div>
  );
}
