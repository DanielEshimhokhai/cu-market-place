"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { readStored, useHydrated, useStoredString, writeStored } from "@/lib/local-store";
import { addLine, cartCount, removeLine, setQuantity, type CartLine } from "./cart";

const STORAGE_KEY = "cu-cart:v1";

type CartApi = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  replace: (lines: CartLine[]) => void;
  clearBusinesses: (businessIds: string[]) => void;
};

const CartContext = createContext<CartApi | null>(null);

function parse(raw: string | null): CartLine[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const raw = useStoredString(STORAGE_KEY);
  const ready = useHydrated();
  const lines = useMemo(() => parse(raw), [raw]);

  // Read the latest stored value (not the render snapshot) so rapid updates compose correctly.
  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    writeStored(STORAGE_KEY, JSON.stringify(fn(parse(readStored(STORAGE_KEY)))));
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      ready,
      count: cartCount(lines),
      add: (line) => update((prev) => addLine(prev, line)),
      setQty: (key, qty) => update((prev) => setQuantity(prev, key, qty)),
      remove: (key) => update((prev) => removeLine(prev, key)),
      replace: (next) => update(() => next),
      clearBusinesses: (ids) => update((prev) => prev.filter((l) => !ids.includes(l.businessId))),
    }),
    [lines, ready, update],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
