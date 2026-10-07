import { describe, expect, test } from "vitest";
import { productSchema } from "@/lib/validation/product";

const BIZ = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const valid = {
  title: "Nike Dunk Low",
  kind: "product",
  category_id: "7f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  description: "Brand new in box.",
  price: "85,000",
  compare_at: "",
  condition: "new",
  stock: "4",
  unlimited: "",
  pickup_location_id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  allows_pickup: "on",
  allows_delivery: "",
  delivery_note: "",
  status: "active",
  images: JSON.stringify([`${BIZ}/a.webp`]),
  variants: "[]",
};

describe("productSchema", () => {
  test("accepts a valid listing and converts naira to kobo", () => {
    const r = productSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.price_kobo).toBe(8_500_000);
      expect(r.data.stock).toBe(4);
      expect(r.data.allows_delivery).toBe(false);
    }
  });
  test("compare-at must be above the price", () => {
    const r = productSchema.safeParse({ ...valid, compare_at: "80000" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === "Compare-at price must be higher than the price")).toBe(true);
  });
  test("needs at least one photo", () => {
    const r = productSchema.safeParse({ ...valid, images: "[]" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Add at least one photo");
  });
  test("at most 8 photos", () => expect(productSchema.safeParse({ ...valid, images: JSON.stringify(Array(9).fill(`${BIZ}/a.webp`)) }).success).toBe(false));
  test("needs pickup or delivery", () => expect(productSchema.safeParse({ ...valid, allows_pickup: "" }).success).toBe(false));
  test("services have no stock or condition", () => {
    const r = productSchema.safeParse({ ...valid, kind: "service", stock: "7" });
    expect(r.success && r.data.stock).toBe(null);
  });
  test("unlimited stock is null", () => expect(productSchema.parse({ ...valid, unlimited: "on" }).stock).toBe(null));
  test("title of 1 character rejected", () => expect(productSchema.safeParse({ ...valid, title: "N" }).success).toBe(false));
  test("price must be a number", () => expect(productSchema.safeParse({ ...valid, price: "free" }).success).toBe(false));
  test("variants parsed and price delta converted", () => {
    const r = productSchema.parse({ ...valid, variants: JSON.stringify([{ name: "Size", value: "42", stock: "2", delta: "1,000" }]) });
    expect(r.variants).toEqual([{ name: "Size", value: "42", stock: 2, price_delta_kobo: 100_000 }]);
  });
  test("duplicate variant values rejected", () =>
    expect(productSchema.safeParse({ ...valid, variants: JSON.stringify([{ name: "Size", value: "42" }, { name: "Size", value: "42" }]) }).success).toBe(false));
  test("image paths must be storage paths or https URLs", () =>
    expect(productSchema.safeParse({ ...valid, images: JSON.stringify(["javascript:alert(1)"]) }).success).toBe(false));
});

test("options use a single name (e.g. all Size) so buyers pick exactly one", () => {
  const r = productSchema.safeParse({ ...valid, variants: JSON.stringify([{ name: "Size", value: "42" }, { name: "Colour", value: "Red" }]) });
  expect(r.success).toBe(false);
  if (!r.success) expect(r.error.issues[0].message).toBe("Use one option type per listing, e.g. Size. List colours as separate listings.");
});
