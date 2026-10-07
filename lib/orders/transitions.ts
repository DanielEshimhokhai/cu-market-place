export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "completed" | "cancelled";
export type Fulfilment = "pickup" | "delivery";
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready_for_pickup", "out_for_delivery", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["completed"],
  completed: [], cancelled: [],
};
export function sellerNextStatuses(s: OrderStatus, f: Fulfilment): OrderStatus[] {
  return NEXT[s].filter((n) => !(n === "ready_for_pickup" && f !== "pickup") && !(n === "out_for_delivery" && f !== "delivery"));
}
export const buyerCanCancel = (s: OrderStatus) => s === "pending";
export const buyerCanConfirmReceipt = (s: OrderStatus) => s === "ready_for_pickup" || s === "out_for_delivery";
export function timelineSteps(s: OrderStatus, f: Fulfilment) {
  if (s === "cancelled") return [
    { key: "pending", label: "Order placed", state: "done" as const },
    { key: "cancelled", label: "Cancelled", state: "current" as const },
  ];
  const handoff: OrderStatus = f === "pickup" ? "ready_for_pickup" : "out_for_delivery";
  const order: { key: OrderStatus; label: string }[] = [
    { key: "pending", label: "Order placed" }, { key: "confirmed", label: "Seller confirmed" },
    { key: "preparing", label: "Preparing" }, { key: handoff, label: STATUS_LABEL[handoff] },
    { key: "completed", label: "Completed" },
  ];
  const idx = order.findIndex((o) => o.key === s);
  return order.map((o, i) => ({
    key: o.key, label: o.label,
    state: s === "completed" || i < idx ? ("done" as const) : i === idx ? ("current" as const) : ("upcoming" as const),
  }));
}
