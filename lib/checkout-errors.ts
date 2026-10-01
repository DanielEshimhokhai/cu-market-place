const MESSAGES: Record<string, string> = {
  OUT_OF_STOCK: "Some items no longer have enough stock. We've updated your cart.",
  NOT_VERIFIED: "Confirm your Covenant University email before ordering.",
  OWN_PRODUCT: "You can't order from your own store.",
  UNAVAILABLE: "Some items are no longer available.",
  DELIVERY_UNAVAILABLE: "Delivery isn't available for one of these sellers.",
  PICKUP_UNAVAILABLE: "Pickup isn't available for one of these sellers. Choose delivery instead.",
  NOT_AUTHENTICATED: "Sign in to place your order.",
};

/** Maps an error raised by the place_orders function to a sentence for the buyer. */
export function checkoutErrorMessage(raw: string): string {
  const code = Object.keys(MESSAGES).find((k) => new RegExp(`\\b${k}\\b`).test(raw));
  return code ? MESSAGES[code] : "We couldn't place your order. Please try again.";
}

/** Errors after which the cart should be re-checked against the database. */
export const shouldReconcile = (raw: string) => /\b(OUT_OF_STOCK|UNAVAILABLE|INVALID_VARIANT)\b/.test(raw);
