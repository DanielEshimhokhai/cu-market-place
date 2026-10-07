"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "neutral" | "success" | "danger";
type ToastAction = { label: string; href: string };
type ToastItem = { id: number; message: string; tone: ToastTone; action?: ToastAction };
type ToastApi = { show: (message: string, opts?: { tone?: ToastTone; action?: ToastAction }) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { id, message, tone: opts?.tone ?? "neutral", action: opts?.action }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex max-w-sm animate-[toast-in_150ms_ease-out] items-center gap-4 rounded-card px-4 py-3 text-sm text-white shadow-overlay",
              t.tone === "danger" ? "bg-danger" : "bg-ink",
            )}
          >
            <span>{t.message}</span>
            {t.action && (
              <Link href={t.action.href} className="shrink-0 font-medium underline underline-offset-2">
                {t.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
