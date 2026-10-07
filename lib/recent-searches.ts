import { readStored, writeStored } from "./local-store";
import { normalizeQuery } from "./search";

export const RECENT_KEY = "cu-recent-searches";
const KEY = RECENT_KEY;
const MAX = 6;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
// In the browser, go through local-store so components reading the value re-render on change.
const browserStore: Store = {
  getItem: (k) => readStored(k),
  setItem: (k, v) => writeStored(k, v),
  removeItem: (k) => writeStored(k, null),
};
const defaultStore = (): Store | null => (typeof window === "undefined" ? null : browserStore);

export { POPULAR_SEARCHES } from "./popular-searches";

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
