import { normalizeQuery } from "./search";

const KEY = "cu-recent-searches";
const MAX = 6;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaultStore = (): Store | null => (typeof localStorage === "undefined" ? null : localStorage);

export const POPULAR_SEARCHES = ["perfume", "thrift", "food", "phone accessories", "sneakers", "cakes", "laptop charger", "braids"];

export function getRecent(store: Store | null = defaultStore()): string[] {
  try {
    const parsed = JSON.parse(store?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(q: string, store: Store | null = defaultStore()): void {
  const term = normalizeQuery(q);
  if (!term || !store) return;
  const next = [term, ...getRecent(store).filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  try {
    store.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked; recent searches are a convenience.
  }
}

export function clearRecent(store: Store | null = defaultStore()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    // ignore
  }
}
