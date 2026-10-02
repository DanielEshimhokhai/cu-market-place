import { describe, expect, test } from "vitest";
import { businessSchema, HOURS_PRESETS, validateHours } from "@/lib/validation/business";

describe("validateHours", () => {
  test("accepts every preset", () => {
    for (const preset of Object.values(HOURS_PRESETS)) expect(() => validateHours(preset.hours)).not.toThrow();
  });
  test("rejects 25:00", () => expect(() => validateHours({ mon: [["09:00", "25:00"]] })).toThrow());
  test("rejects close before open", () => expect(() => validateHours({ mon: [["18:00", "09:00"]] })).toThrow());
  test("rejects close equal to open", () => expect(() => validateHours({ mon: [["09:00", "09:00"]] })).toThrow());
  test("rejects more than 3 ranges a day", () =>
    expect(() => validateHours({ mon: [["08:00", "09:00"], ["10:00", "11:00"], ["12:00", "13:00"], ["14:00", "15:00"]] })).toThrow());
  test("rejects unknown day keys", () => expect(() => validateHours({ funday: [["09:00", "10:00"]] })).toThrow());
  test("drops empty days", () => expect(validateHours({ mon: [["09:00", "17:00"]], tue: [] })).toEqual({ mon: [["09:00", "17:00"]] }));
});

const valid = {
  name: "Daniel's Closet", tagline: "Clean streetwear", description: "", category_id: "7f9c2b1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  location_id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", seller_type: "student", offers_delivery: "on", delivery_note: "₦300 to any hall",
  hours: JSON.stringify(HOURS_PRESETS.student.hours),
};

describe("businessSchema", () => {
  test("accepts a valid store", () => expect(businessSchema.safeParse(valid).success).toBe(true));
  test("checkbox 'on' becomes true, missing becomes false", () => {
    expect(businessSchema.parse(valid).offers_delivery).toBe(true);
    const rest: Record<string, string> = { ...valid };
    delete rest.offers_delivery;
    expect(businessSchema.parse(rest).offers_delivery).toBe(false);
  });
  test("name too short", () => expect(businessSchema.safeParse({ ...valid, name: "D" }).success).toBe(false));
  test("needs a category and location", () => {
    expect(businessSchema.safeParse({ ...valid, category_id: "" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...valid, location_id: "" }).success).toBe(false);
  });
  test("rejects room numbers in the tagline", () =>
    expect(businessSchema.safeParse({ ...valid, tagline: "Come to room 204, Daniel Hall" }).success).toBe(false));
  test("bad hours JSON is rejected", () => expect(businessSchema.safeParse({ ...valid, hours: "{oops" }).success).toBe(false));
});
