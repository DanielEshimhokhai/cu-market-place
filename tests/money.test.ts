import { describe, expect, test } from "vitest";
import { formatNaira, nairaToKobo } from "@/lib/money";
describe("formatNaira", () => {
  test("whole naira", () => expect(formatNaira(8_500_000)).toBe("₦85,000"));
  test("zero", () => expect(formatNaira(0)).toBe("₦0"));
  test("kobo shown when present", () => expect(formatNaira(150)).toBe("₦1.50"));
});
describe("nairaToKobo", () => {
  test("grouped", () => expect(nairaToKobo("85,000")).toBe(8_500_000));
  test("symbol + decimals", () => expect(nairaToKobo("₦1,250.5")).toBe(125_050));
  test("rejects junk", () => expect(nairaToKobo("12a")).toBeNull());
  test("rejects negative", () => expect(nairaToKobo("-5")).toBeNull());
  test("rejects empty", () => expect(nairaToKobo("  ")).toBeNull());
});
