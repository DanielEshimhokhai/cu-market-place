import { expect, test } from "vitest";
import { checkoutErrorMessage } from "@/lib/checkout-errors";

test.each([
  ["OUT_OF_STOCK", "Some items no longer have enough stock. We've updated your cart."],
  ["NOT_VERIFIED", "Confirm your Covenant University email before ordering."],
  ["OWN_PRODUCT", "You can't order from your own store."],
  ["UNAVAILABLE", "Some items are no longer available."],
  ["DELIVERY_UNAVAILABLE", "Delivery isn't available for one of these sellers."],
  ["PICKUP_UNAVAILABLE", "Pickup isn't available for one of these sellers. Choose delivery instead."],
  ["NOT_AUTHENTICATED", "Sign in to place your order."],
  ["something unexpected", "We couldn't place your order. Please try again."],
])("%s", (code, message) => expect(checkoutErrorMessage(code)).toBe(message));

test("matches codes embedded in a longer Postgres message", () =>
  expect(checkoutErrorMessage("ERROR: OUT_OF_STOCK (P0001)")).toBe("Some items no longer have enough stock. We've updated your cart."));

import { shouldReconcile } from "@/lib/checkout-errors";

test("a price change is explained and triggers a cart re-check", () => {
  expect(checkoutErrorMessage("PRICE_CHANGED")).toBe("A price changed since you opened your cart. We've updated it — check the new total and place your order again.");
  expect(shouldReconcile("PRICE_CHANGED")).toBe(true);
});
