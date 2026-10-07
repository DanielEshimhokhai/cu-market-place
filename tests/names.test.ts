import { expect, test } from "vitest";
import { shortName, initials } from "@/lib/names";
test("short name", () => expect(shortName("Tobi Adeyemi")).toBe("Tobi A."));
test("single name", () => expect(shortName("Tobi")).toBe("Tobi"));
test("blank", () => expect(shortName("  ")).toBe("Student"));
test("initials", () => { expect(initials("Campus Bites")).toBe("CB"); expect(initials("The Thrift Room")).toBe("TT"); });
