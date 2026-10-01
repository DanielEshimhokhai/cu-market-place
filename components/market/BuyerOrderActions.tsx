"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { updateOrderStatus } from "@/lib/actions/orders";
import { buyerCanCancel, buyerCanConfirmReceipt, type OrderStatus } from "@/lib/orders/transitions";

type Props = { orderId: string; number: number; status: OrderStatus; reviewable: boolean; messageHref: string };

export function BuyerOrderActions({ orderId, number, status, reviewable, messageHref }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReceived, setConfirmReceived] = useState(false);
  const [reason, setReason] = useState("");

  const run = (next: OrderStatus, done: string) =>
    start(async () => {
      const r = await updateOrderStatus({ orderId, status: next, reason: next === "cancelled" ? reason || undefined : undefined });
      setConfirmCancel(false);
      setConfirmReceived(false);
      if (!r.ok) toast.show(r.error ?? "Something went wrong.", { tone: "danger" });
      else {
        toast.show(done);
        router.refresh();
      }
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {buyerCanConfirmReceipt(status) && <Button onClick={() => setConfirmReceived(true)}>I&apos;ve received it</Button>}
        {reviewable && <Link href={`/orders/${orderId}/review`} className={buttonClass("primary", "md")}>Leave a review</Link>}
        <Link href={messageHref} className={buttonClass("secondary", "md")}>Message seller</Link>
        {buyerCanCancel(status) && <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={`Cancel order #${number}?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep order</Button>
            <Button variant="danger" loading={pending} onClick={() => run("cancelled", "Order cancelled")}>Cancel order</Button>
          </div>
        }
      >
        <p className="text-sm text-muted">The seller hasn&apos;t confirmed yet, so you can cancel for free. They&apos;ll be notified.</p>
        <Field label="Reason" htmlFor="cancel-reason" optional className="mt-4">
          <Textarea id="cancel-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Ordered the wrong size" />
        </Field>
      </Modal>

      <Modal
        open={confirmReceived}
        onClose={() => setConfirmReceived(false)}
        title="Confirm you've received it?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReceived(false)}>Not yet</Button>
            <Button loading={pending} onClick={() => run("completed", "Order completed. Thanks!")}>Yes, I have it</Button>
          </div>
        }
      >
        <p className="text-sm text-muted">This completes the order. Only confirm once you have the item and you&apos;re happy with it.</p>
      </Modal>
    </>
  );
}
