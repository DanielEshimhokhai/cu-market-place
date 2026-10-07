import { z } from "zod";

export const REPORT_REASONS = [
  { value: "fraud", label: "Fraud", hint: "Took payment or tried to scam" },
  { value: "wrong_product", label: "Wrong product", hint: "Not what was described" },
  { value: "counterfeit", label: "Counterfeit", hint: "Fake branded item" },
  { value: "harassment", label: "Harassment", hint: "Abusive or threatening behaviour" },
  { value: "spam", label: "Spam", hint: "Repeated or irrelevant listings" },
  { value: "prohibited_item", label: "Prohibited item", hint: "Not allowed on campus or by law" },
  { value: "other", label: "Other", hint: "Something else" },
] as const;

export const reportSchema = z
  .object({
    target_type: z.enum(["product", "business", "user", "review"]),
    target_id: z.uuid(),
    reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]], { message: "Choose a reason" }),
    details: z.string().trim().max(1000, "Keep it under 1,000 characters").optional().default(""),
  })
  .superRefine((r, ctx) => {
    if (r.reason === "other" && r.details.length < 10) {
      ctx.addIssue({ code: "custom", path: ["details"], message: "Tell us a bit more (at least 10 characters)" });
    }
  });
