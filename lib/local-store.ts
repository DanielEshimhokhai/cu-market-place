import { useSyncExternalStore } from "react";

// localStorage can throw (private mode, blocked storage); fall back to memory for this page view.
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStored(key: string, value: string | null): void {
  memory.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable; memory copy is enough
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The raw stored string, kept in sync across components and tabs. Null on the server and before hydration. */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readStored(key), () => null);
}

/** False during SSR and the hydration render, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
