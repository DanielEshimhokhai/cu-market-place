import { beforeEach, expect, test } from "vitest";
import { clearRecent, getRecent, pushRecent } from "@/lib/recent-searches";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

let store: MemoryStorage;
beforeEach(() => { store = new MemoryStorage(); });

test("newest first", () => {
  pushRecent("sneakers", store);
  pushRecent("cakes", store);
  expect(getRecent(store)).toEqual(["cakes", "sneakers"]);
});

test("dedups case-insensitively, moving the term to the front", () => {
  pushRecent("Sneakers", store);
  pushRecent("cakes", store);
  pushRecent("sneakers", store);
  expect(getRecent(store)).toEqual(["sneakers", "cakes"]);
});

test("caps at 6", () => {
  for (const q of ["a1", "b2", "c3", "d4", "e5", "f6", "g7"]) pushRecent(q, store);
  expect(getRecent(store)).toHaveLength(6);
  expect(getRecent(store)[0]).toBe("g7");
});

test("ignores blank input and normalises whitespace", () => {
  pushRecent("   ", store);
  pushRecent("  laptop   charger ", store);
  expect(getRecent(store)).toEqual(["laptop charger"]);
});

test("survives corrupt storage", () => {
  store.setItem("cu-recent-searches", "{not json");
  expect(getRecent(store)).toEqual([]);
});

test("clear", () => {
  pushRecent("x", store);
  clearRecent(store);
  expect(getRecent(store)).toEqual([]);
});
