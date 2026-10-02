import { z } from "zod";
import { nairaToKobo } from "@/lib/money";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const jsonArray = <T extends z.ZodTypeAny>(item: T, max: number, maxMsg: string) =>
  z.string().transform((s, ctx) => {
    try {
      const parsed = JSON.parse(s || "[]");
      if (!Array.isArray(parsed)) throw new Error();
      const r = z.array(item).max(max, maxMsg).safeParse(parsed);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: r.error.issues[0].message });
        return z.NEVER;
      }
      return r.data as z.output<T>[];
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid data" });
      return z.NEVER;
    }
  });

// Storage object path ({uuid}/{file}.webp) or an absolute https URL (seeded images).
const imagePath = z.string().regex(/^([0-9a-f-]{36}\/[a-z0-9-]+\.webp|https:\/\/[^\s"'<>]+)$/i, "Invalid image");
const nairaInt = (v: unknown) => (v === "" || v === undefined || v === null ? null : /^\d+$/.test(String(v).replace(/[,\s₦]/g, "")) ? Number(String(v).replace(/[,\s₦]/g, "")) : NaN);

const variant = z.object({
  name: z.string().trim().min(1, "Name each option, e.g. Size").max(30),
  value: z.string().trim().min(1, "Fill in every option value").max(40),
  stock: z.preprocess(nairaInt, z.number().int().min(0).max(10000).nullable()).optional().transform((v) => v ?? null),
  delta: z.preprocess((v) => (v === "" || v === undefined ? 0 : nairaToKobo(String(v)) ?? NaN), z.number().int().min(0).max(100_000_000)).optional(),
});

export const productSchema = z
  .object({
    title: z.string().trim().min(2, "Give the listing a title").max(90, "Keep the title under 90 characters"),
    kind: z.enum(["product", "service"]),
    category_id: z.uuid("Choose a category"),
    description: z.string().trim().max(3000, "Keep the description under 3,000 characters").default(""),
    price: z.string().transform((v, ctx) => {
      const kobo = nairaToKobo(v);
      if (kobo === null) {
        ctx.addIssue({ code: "custom", message: "Enter a price in naira, e.g. 8,500" });
        return z.NEVER;
      }
      return kobo;
    }),
    compare_at: z.string().optional().transform((v) => (v ? nairaToKobo(v) : null)),
    condition: z.enum(["new", "like_new", "used"]).default("new"),
    stock: z.preprocess(nairaInt, z.number({ message: "Enter how many you have" }).int().min(0).max(10000).nullable()),
    unlimited: checkbox,
    pickup_location_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    allows_pickup: checkbox,
    allows_delivery: checkbox,
    delivery_note: z.string().trim().max(200).optional().transform((v) => v || null),
    status: z.enum(["active", "draft", "paused"]),
    images: jsonArray(imagePath, 8, "Up to 8 photos").refine((a) => a.length > 0, "Add at least one photo"),
    variants: jsonArray(variant, 30, "Up to 30 options"),
  })
  .superRefine((p, ctx) => {
    if (p.compare_at !== null && (Number.isNaN(p.compare_at) || p.compare_at <= p.price)) {
      ctx.addIssue({ code: "custom", path: ["compare_at"], message: "Compare-at price must be higher than the price" });
    }
    if (!p.allows_pickup && !p.allows_delivery) ctx.addIssue({ code: "custom", path: ["allows_pickup"], message: "Offer pickup, delivery, or both" });
    const keys = p.variants.map((v) => `${v.name.toLowerCase()}:${v.value.toLowerCase()}`);
    if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", path: ["variants"], message: "Each option value should appear once" });
  })
  .transform((p) => ({
    title: p.title,
    kind: p.kind,
    category_id: p.category_id,
    description: p.description,
    price_kobo: p.price,
    compare_at_kobo: p.compare_at,
    condition: p.kind === "service" ? ("new" as const) : p.condition,
    stock: p.kind === "service" || p.unlimited ? null : p.stock,
    pickup_location_id: p.pickup_location_id,
    allows_pickup: p.allows_pickup,
    allows_delivery: p.allows_delivery,
    delivery_note: p.allows_delivery ? p.delivery_note : null,
    status: p.status,
    images: p.images,
    variants: p.variants.map((v) => ({ name: v.name, value: v.value, stock: v.stock, price_delta_kobo: v.delta ?? 0 })),
  }));

export type ProductInput = z.output<typeof productSchema>;
