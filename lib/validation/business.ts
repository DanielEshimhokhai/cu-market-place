import { z } from "zod";
import { WEEKDAYS, type OpeningHours, type Weekday } from "@/lib/hours";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 09:00");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const range = z.tuple([time, time]).refine(([o, c]) => toMin(c) > toMin(o), "Closing time must be after opening time");
const hoursObject = z.partialRecord(z.enum(WEEKDAYS as [Weekday, ...Weekday[]]), z.array(range).max(3, "At most 3 time ranges a day"));

/** Validates opening hours and drops days with no ranges. Throws ZodError when invalid. */
export function validateHours(input: unknown): OpeningHours {
  const parsed = z.object({}).catchall(z.unknown()).parse(input);
  const unknown = Object.keys(parsed).find((k) => !(WEEKDAYS as string[]).includes(k));
  if (unknown) throw new z.ZodError([{ code: "custom", message: `Unknown day: ${unknown}`, path: ["hours"], input }]);
  const valid = hoursObject.parse(parsed);
  return Object.fromEntries(Object.entries(valid).filter(([, ranges]) => ranges && ranges.length)) as OpeningHours;
}

const weekdays = (r: [string, string][]) => ({ mon: r, tue: r, wed: r, thu: r, fri: r });
export const HOURS_PRESETS: Record<"student" | "food" | "service", { label: string; hint: string; hours: OpeningHours }> = {
  student: { label: "After lectures", hint: "Weekdays 4–9pm, Saturday 10am–6pm", hours: { ...weekdays([["16:00", "21:00"]]), sat: [["10:00", "18:00"]] } },
  food: { label: "Food hours", hint: "Mon–Sat 8am–8pm, Sunday 2–7pm", hours: { ...weekdays([["08:00", "20:00"]]), sat: [["08:00", "20:00"]], sun: [["14:00", "19:00"]] } },
  service: { label: "Weekdays 10–6", hint: "Weekdays 10am–6pm, Saturday 11am–4pm", hours: { ...weekdays([["10:00", "18:00"]]), sat: [["11:00", "16:00"]] } },
};

const noRoomNumbers = (v: string | undefined) => !v || !/\b(room|rm)\.?\s*\d+/i.test(v);
const ROOM_MSG = "Don't put your room number here. Share exact pickup details privately when someone orders.";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const optionalText = (max: number) =>
  z.string().trim().max(max, `Keep it under ${max} characters`).optional().transform((v) => (v ? v : undefined));

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Enter your store name").max(60, "Keep it under 60 characters"),
  tagline: optionalText(90).refine(noRoomNumbers, ROOM_MSG),
  description: optionalText(1500).refine(noRoomNumbers, ROOM_MSG),
  category_id: z.uuid("Choose a category"),
  location_id: z.uuid("Choose a pickup area"),
  seller_type: z.enum(["student", "business"], { message: "Choose a seller type" }),
  offers_delivery: checkbox,
  delivery_note: optionalText(200),
  hours: z
    .string()
    .transform((s, ctx) => {
      try {
        return validateHours(JSON.parse(s));
      } catch {
        ctx.addIssue({ code: "custom", message: "Check your opening hours" });
        return z.NEVER;
      }
    }),
});

export type BusinessInput = z.output<typeof businessSchema>;
