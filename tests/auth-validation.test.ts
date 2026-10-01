import { describe, expect, test } from "vitest";
import { signUpSchema, signInSchema, passwordSchema } from "@/lib/validation/auth";
import { safeNext } from "@/lib/redirects";
import { fieldErrors } from "@/lib/actions/result";

const valid = { full_name: "Tobi Adeyemi", email: "tobi.adeyemi@stu.cu.edu.ng", affiliation: "student", password: "campus2026", phone: "" };

describe("signUpSchema", () => {
  test("accepts a valid student", () => expect(signUpSchema.safeParse(valid).success).toBe(true));
  test("normalises email case", () => {
    const r = signUpSchema.safeParse({ ...valid, email: " Tobi@STU.CU.EDU.NG " });
    expect(r.success && r.data.email).toBe("tobi@stu.cu.edu.ng");
  });
  test("rejects non-CU email with a clear message", () => {
    const r = signUpSchema.safeParse({ ...valid, email: "tobi@gmail.com" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toMatch(/Covenant University email/);
  });
  test("rejects short password", () => expect(signUpSchema.safeParse({ ...valid, password: "abc12" }).success).toBe(false));
  test("rejects password without a digit", () => expect(signUpSchema.safeParse({ ...valid, password: "onlyletters" }).success).toBe(false));
  test("accepts Nigerian phone formats", () => {
    expect(signUpSchema.safeParse({ ...valid, phone: "08031234567" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, phone: "+2348031234567" }).success).toBe(true);
  });
  test("rejects malformed phone", () => expect(signUpSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false));
  test("empty phone becomes undefined", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success && r.data.phone).toBeUndefined();
  });
  test("rejects unknown affiliation", () => expect(signUpSchema.safeParse({ ...valid, affiliation: "alumni" }).success).toBe(false));
});

test("signInSchema needs both fields", () => {
  expect(signInSchema.safeParse({ email: "a@b.c", password: "" }).success).toBe(false);
});

test("passwordSchema", () => expect(passwordSchema.safeParse("newpass99").success).toBe(true));

describe("safeNext", () => {
  test("keeps relative paths", () => expect(safeNext("/orders?tab=active")).toBe("/orders?tab=active"));
  test("rejects protocol-relative", () => expect(safeNext("//evil.com")).toBe("/"));
  test("rejects absolute urls", () => expect(safeNext("https://evil.com")).toBe("/"));
  test("rejects backslash trick", () => expect(safeNext("/\\evil.com")).toBe("/"));
  test("null falls back", () => expect(safeNext(null, "/account")).toBe("/account"));
});
