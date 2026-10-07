import { expect, test } from "vitest";
import { sellerNextStatuses, buyerCanCancel, buyerCanConfirmReceipt, timelineSteps } from "@/lib/orders/transitions";
test("pending -> confirm/cancel", () => expect(sellerNextStatuses("pending", "pickup")).toEqual(["confirmed", "cancelled"]));
test("pickup skips delivery state", () =>
  expect(sellerNextStatuses("confirmed", "pickup")).toEqual(["preparing", "ready_for_pickup", "cancelled"]));
test("delivery skips pickup state", () =>
  expect(sellerNextStatuses("preparing", "delivery")).toEqual(["out_for_delivery", "cancelled"]));
test("terminal", () => { expect(sellerNextStatuses("completed", "pickup")).toEqual([]); expect(sellerNextStatuses("cancelled", "pickup")).toEqual([]); });
test("buyer cancel only pending", () => { expect(buyerCanCancel("pending")).toBe(true); expect(buyerCanCancel("confirmed")).toBe(false); });
test("buyer confirm receipt", () => { expect(buyerCanConfirmReceipt("ready_for_pickup")).toBe(true); expect(buyerCanConfirmReceipt("preparing")).toBe(false); });
test("timeline ready for pickup", () =>
  expect(timelineSteps("ready_for_pickup", "pickup").map((s) => `${s.label}:${s.state}`)).toEqual([
    "Order placed:done", "Seller confirmed:done", "Preparing:done", "Ready for pickup:current", "Completed:upcoming",
  ]));
test("timeline cancelled", () =>
  expect(timelineSteps("cancelled", "pickup").map((s) => `${s.label}:${s.state}`)).toEqual(["Order placed:done", "Cancelled:current"]));
test("timeline completed all done", () =>
  expect(timelineSteps("completed", "delivery").every((s) => s.state === "done")).toBe(true));
