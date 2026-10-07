import { z } from "zod";
import { isCuEmail } from "@/lib/email";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email")
  .refine((v) => isCuEmail(v), "Use your Covenant University email (e.g. name@stu.cu.edu.ng)");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^(\+234|0)[789][01]\d{8}$/.test(v), "Enter a Nigerian number, e.g. 08031234567")
  .transform((v) => (v === "" ? undefined : v));

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(60, "Keep it under 60 characters"),
  email,
  affiliation: z.enum(["student", "staff"], { message: "Choose student or staff" }),
  password: passwordSchema,
  phone: phone.optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

export const resetSchema = z.object({ email });
