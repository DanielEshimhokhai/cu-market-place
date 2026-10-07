import { expect, test } from "vitest";
import { reportSchema } from "@/lib/validation/report";

const valid = { target_type: "product", target_id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", reason: "counterfeit", details: "" };

test("accepts a reason without details", () => expect(reportSchema.safeParse(valid).success).toBe(true));
test("'other' needs details of at least 10 characters", () => {
  const r = reportSchema.safeParse({ ...valid, reason: "other", details: "bad" });
  expect(r.success).toBe(false);
  if (!r.success) expect(r.error.issues[0].message).toBe("Tell us a bit more (at least 10 characters)");
  expect(reportSchema.safeParse({ ...valid, reason: "other", details: "Seller asked me to pay first" }).success).toBe(true);
});
test("invalid reason rejected", () => expect(reportSchema.safeParse({ ...valid, reason: "ugly" }).success).toBe(false));
test("invalid target type rejected", () => expect(reportSchema.safeParse({ ...valid, target_type: "order" }).success).toBe(false));
test("details capped at 1000", () => expect(reportSchema.safeParse({ ...valid, details: "x".repeat(1001) }).success).toBe(false));
