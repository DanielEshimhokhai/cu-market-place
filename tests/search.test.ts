import { expect, test } from "vitest";
import { normalizeQuery, escapeLike } from "@/lib/search";
test("trims and collapses", () => expect(normalizeQuery("  black   shirt ")).toBe("black shirt"));
test("null/whitespace -> empty", () => { expect(normalizeQuery(null)).toBe(""); expect(normalizeQuery("   ")).toBe(""); });
test("caps length", () => expect(normalizeQuery("a".repeat(200))).toHaveLength(80));
test("escapes like wildcards", () => expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\"));
