import { expect, test } from "vitest";
import { openStatus, formatTime } from "@/lib/hours";
const hours = { thu: [["09:00", "18:00"]], fri: [["10:00", "14:00"]] } as const;
const at = (utc: string) => new Date(utc);
test("open inside range", () =>
  expect(openStatus(hours as any, at("2026-10-01T10:00:00Z"))).toEqual({ open: true, label: "Open · closes 6:00 PM" }));
test("before opening same day", () =>
  expect(openStatus(hours as any, at("2026-10-01T06:00:00Z"))).toEqual({ open: false, label: "Closed · opens 9:00 AM" }));
test("after closing -> next day", () =>
  expect(openStatus(hours as any, at("2026-10-01T18:30:00Z"))).toEqual({ open: false, label: "Closed · opens Fri 10:00 AM" }));
test("no hours", () => expect(openStatus(null)).toEqual({ open: false, label: "Hours not set" }));
test("formatTime", () => { expect(formatTime("00:30")).toBe("12:30 AM"); expect(formatTime("12:00")).toBe("12:00 PM"); });
