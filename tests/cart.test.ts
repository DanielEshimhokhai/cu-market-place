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
