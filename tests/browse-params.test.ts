import { expect, test } from "vitest";
import { activeFilterCount, parseBrowseParams, toSearchParams } from "@/lib/browse-params";

test("drops non-numeric prices", () => expect(parseBrowseParams({ min: "abc", max: "5000" })).toEqual({ max: 5000 }));
test("drops out-of-range rating", () => expect(parseBrowseParams({ rating: "9" }).rating).toBeUndefined());
test("accepts rating 4", () => expect(parseBrowseParams({ rating: "4" }).rating).toBe(4));
test("unknown sort falls back to recommended (omitted)", () => expect(parseBrowseParams({ sort: "bogus" }).sort).toBeUndefined());
test("page 0 becomes undefined (page 1)", () => expect(parseBrowseParams({ page: "0" }).page).toBeUndefined());
test("page 3 kept", () => expect(parseBrowseParams({ page: "3" }).page).toBe(3));
test("repeated keys take the first value", () => expect(parseBrowseParams({ category: ["food", "fashion"] }).category).toBe("food"));
test("inStock=1 is true", () => expect(parseBrowseParams({ inStock: "1" }).inStock).toBe(true));
test("invalid enum values dropped", () => {
  const p = parseBrowseParams({ kind: "x", seller: "y", condition: "z", fulfilment: "w" });
  expect(p).toEqual({});
});
test("min > max are swapped", () => expect(parseBrowseParams({ min: "9000", max: "1000" })).toEqual({ min: 1000, max: 9000 }));
test("slugs are validated", () => expect(parseBrowseParams({ category: "../etc", location: "daniel-hall" })).toEqual({ location: "daniel-hall" }));

test("round-trip is stable", () => {
  const x = { q: "sneakers", category: "shoes", min: "5000", max: "90000", rating: "4", inStock: "1", seller: "verified", sort: "price_asc", page: "2" };
  const once = parseBrowseParams(x);
  const twice = parseBrowseParams(Object.fromEntries(toSearchParams(once)));
  expect(twice).toEqual(once);
});

test("toSearchParams omits defaults", () => expect(toSearchParams({}).toString()).toBe(""));

test("activeFilterCount ignores q, sort and page", () =>
  expect(activeFilterCount({ q: "x", sort: "newest", page: 2, category: "food", inStock: true })).toBe(2));
