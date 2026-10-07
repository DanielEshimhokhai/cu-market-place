import { expect, test } from "vitest";
import { addLine, setQuantity, removeLine, cartCount, groupBySeller, lineKey, type CartLine } from "@/lib/cart/cart";
const base = (o: Partial<CartLine>): CartLine => ({ productId: "p1", variantId: null, variantLabel: null, quantity: 1, title: "Dunk",
  productSlug: "dunk", imageUrl: null, unitPriceKobo: 1000, businessId: "b1", businessName: "Daniel's Closet", businessSlug: "daniels-closet",
  maxQuantity: null, allowsPickup: true, allowsDelivery: false, ...o });
test("merges same product+variant", () => expect(addLine([base({})], base({ quantity: 2 }))[0].quantity).toBe(3));
test("different variant is separate line", () => expect(addLine([base({})], base({ variantId: "v2" }))).toHaveLength(2));
test("clamps to stock", () => expect(addLine([base({ maxQuantity: 2 })], base({ quantity: 5, maxQuantity: 2 }))[0].quantity).toBe(2));
test("clamps to 20", () => expect(addLine([], base({ quantity: 50 }))[0].quantity).toBe(20));
test("setQuantity 0 removes", () => expect(setQuantity([base({})], lineKey(base({})), 0)).toEqual([]));
test("remove", () => expect(removeLine([base({})], "p1:")).toEqual([]));
test("count", () => expect(cartCount([base({ quantity: 2 }), base({ productId: "p2", quantity: 3 })])).toBe(5));
test("groups by seller preserving order, subtotals", () => {
  const g = groupBySeller([base({ quantity: 2 }), base({ productId: "p2", businessId: "b2", businessName: "Campus Bites", allowsDelivery: true }), base({ productId: "p3", unitPriceKobo: 500 })]);
  expect(g.map((x) => x.businessId)).toEqual(["b1", "b2"]);
  expect(g[0].subtotalKobo).toBe(2500);
  expect(g[0].deliveryAvailable).toBe(false);
  expect(g[1].deliveryAvailable).toBe(true);
});

import { reconcileLines, type LiveLine } from "@/lib/cart/cart";
const live = (o: Partial<LiveLine>): LiveLine => ({ productId: "p1", variantId: null, available: true, unitPriceKobo: 1000, maxQuantity: null,
  allowsPickup: true, allowsDelivery: false, ...o });

test("reconcile: unchanged lines produce no notices", () => {
  const r = reconcileLines([base({})], [live({})]);
  expect(r.notices).toEqual({});
  expect(r.lines[0].unitPriceKobo).toBe(1000);
});
test("reconcile: price change updates the line and flags it", () => {
  const r = reconcileLines([base({})], [live({ unitPriceKobo: 1500 })]);
  expect(r.lines[0].unitPriceKobo).toBe(1500);
  expect(r.notices["p1:"]).toBe("price");
});
test("reconcile: quantity above live stock is clamped and flagged", () => {
  const r = reconcileLines([base({ quantity: 5 })], [live({ maxQuantity: 2 })]);
  expect(r.lines[0].quantity).toBe(2);
  expect(r.notices["p1:"]).toBe("quantity");
});
test("reconcile: missing or unavailable lines are kept but flagged unavailable", () => {
  const r = reconcileLines([base({}), base({ productId: "p2" })], [live({ available: false })]);
  expect(r.notices["p1:"]).toBe("unavailable");
  expect(r.notices["p2:"]).toBe("unavailable");
  expect(r.lines).toHaveLength(2);
});
test("reconcile: sold out (max 0) is unavailable", () => {
  expect(reconcileLines([base({})], [live({ maxQuantity: 0 })]).notices["p1:"]).toBe("unavailable");
});
