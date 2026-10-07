import { expect, test } from "vitest";
import { reviewSchema } from "@/lib/validation/review";

const valid = {
  order_id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  product_id: "7f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  rating: "5",
  quality: "",
  communication: "4",
  accuracy: "",
  fulfilment_rating: "",
  body: "  Exactly as described.  ",
};

test("accepts a valid review and trims the body", () => {
  const r = reviewSchema.parse(valid);
  expect(r.rating).toBe(5);
  expect(r.body).toBe("Exactly as described.");
});
test("empty sub-ratings become undefined", () => {
  const r = reviewSchema.parse(valid);
  expect(r.quality).toBeUndefined();
  expect(r.communication).toBe(4);
});
test("rating 0 rejected", () => expect(reviewSchema.safeParse({ ...valid, rating: "0" }).success).toBe(false));
test("rating 6 rejected", () => expect(reviewSchema.safeParse({ ...valid, rating: "6" }).success).toBe(false));
test("missing rating rejected with a clear message", () => {
  const r = reviewSchema.safeParse({ ...valid, rating: "" });
  expect(r.success).toBe(false);
  if (!r.success) expect(r.error.issues[0].message).toBe("Choose a star rating");
});
test("body over 1000 characters rejected", () => expect(reviewSchema.safeParse({ ...valid, body: "a".repeat(1001) }).success).toBe(false));
test("empty body becomes undefined", () => expect(reviewSchema.parse({ ...valid, body: "   " }).body).toBeUndefined());
