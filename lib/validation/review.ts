import { z } from "zod";

const subRating = z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z.number().int().min(1).max(5).optional());

export const reviewSchema = z.object({
  order_id: z.uuid(),
  product_id: z.uuid(),
  rating: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number({ message: "Choose a star rating" }).int().min(1, "Choose a star rating").max(5)),
  quality: subRating,
  communication: subRating,
  accuracy: subRating,
  fulfilment_rating: subRating,
  body: z
    .string()
    .max(1000, "Keep it under 1,000 characters")
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export type ReviewInput = z.output<typeof reviewSchema>;
