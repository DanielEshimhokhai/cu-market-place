import { expect, test } from "vitest";
import { isCuEmail } from "@/lib/email";
const d = ["stu.cu.edu.ng", "covenantuniversity.edu.ng"];
test("student domain", () => expect(isCuEmail("tobi.adeyemi@stu.cu.edu.ng", d)).toBe(true));
test("case + whitespace", () => expect(isCuEmail("  Tobi@STU.CU.EDU.NG ", d)).toBe(true));
test("staff domain", () => expect(isCuEmail("a.b@covenantuniversity.edu.ng", d)).toBe(true));
test("lookalike subdomain rejected", () => expect(isCuEmail("x@evil.stu.cu.edu.ng", d)).toBe(false));
test("gmail rejected", () => expect(isCuEmail("x@gmail.com", d)).toBe(false));
test("no local part", () => expect(isCuEmail("@stu.cu.edu.ng", d)).toBe(false));
