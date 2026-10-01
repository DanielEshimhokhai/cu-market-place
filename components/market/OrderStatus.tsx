import { Check } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, timelineSteps, type Fulfilment, type OrderStatus } from "@/lib/orders/transitions";
import { formatDateTime } from "@/lib/time";

const TONE: Record<OrderStatus, BadgeTone> = {
  pending: "neutral",
  confirmed: "accent",
  preparing: "accent",
  ready_for_pickup: "success",
  out_for_delivery: "success",
  completed: "neutral",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={TONE[status]}>
      {status === "completed" && <Check size={12} strokeWidth={2.25} aria-hidden />}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function OrderTimeline({ status, fulfilment, events }: { status: OrderStatus; fulfilment: Fulfilment; events: { status: OrderStatus; created_at: string }[] }) {
  const at = new Map(events.map((e) => [e.status, e.created_at]));
  const steps = timelineSteps(status, fulfilment);
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const time = at.get(s.key as OrderStatus);
        const last = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span aria-hidden className={cn("absolute top-5 left-[9px] h-[calc(100%-16px)] w-px", s.state === "done" ? "bg-ink" : "bg-line")} />}
            <span
              aria-hidden
              className={cn(
                "relative mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border",
                s.state === "done" && "border-ink bg-ink text-white",
                s.state === "current" && (s.key === "cancelled" ? "border-danger bg-danger" : "border-accent bg-accent"),
                s.state === "upcoming" && "border-line-strong bg-surface",
              )}
            >
              {s.state === "done" && <Check size={11} strokeWidth={3} />}
              {s.state === "current" && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm", s.state === "current" ? "font-semibold text-ink" : s.state === "done" ? "text-ink" : "text-muted")}>
                {s.label}
                <span className="sr-only"> ({s.state})</span>
              </p>
              {time && s.state !== "upcoming" && <p className="text-xs text-muted">{formatDateTime(time)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
