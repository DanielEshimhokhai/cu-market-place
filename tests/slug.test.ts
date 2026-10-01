import { expect, test } from "vitest";
import { slugify, withSuffix } from "@/lib/slug";
test("slugify", () => expect(slugify("  Nike Dunk Low — Panda (Size 42)! ")).toBe("nike-dunk-low-panda-size-42"));
test("apostrophes dropped", () => expect(slugify("Daniel's Closet")).toBe("daniels-closet"));
test("empty falls back", () => expect(slugify("!!!")).toBe("item"));
test("suffix", () => expect(withSuffix("nike-dunk", "a1b2")).toBe("nike-dunk-a1b2"));
