import { cn } from "@/lib/cn";
import { test, expect } from "vitest";

test("cn joins truthy classes", () => expect(cn("a", false && "b", "c")).toBe("a c"));
