"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage unavailable (private mode); the cart still works for this page view.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      write(next);
      return next;
    });
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
