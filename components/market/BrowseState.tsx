"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { toSearchParams, type BrowseParams } from "@/lib/browse-params";

type BrowseApi = { params: BrowseParams; pending: boolean; update: (patch: Partial<BrowseParams>) => void; reset: () => void };

const Ctx = createContext<BrowseApi | null>(null);

/** Holds the URL-driven browse state. Filter changes replace the URL inside a transition (no scroll jump). */
export function BrowseState({ params, children }: { params: BrowseParams; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const navigate = (next: BrowseParams) => {
    const qs = toSearchParams(next).toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const api: BrowseApi = {
    params,
    pending,
    // Any filter change resets pagination.
    update: (patch) => navigate({ ...params, ...patch, page: undefined }),
    reset: () => navigate({ q: params.q, sort: params.sort, kind: pathname === "/browse" ? undefined : params.kind }),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBrowse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBrowse must be used inside BrowseState");
  return ctx;
}

export function BrowseResults({ children }: { children: ReactNode }) {
  const { pending } = useBrowse();
  return (
    <div aria-busy={pending} className={cn("transition-opacity duration-150", pending && "opacity-60")}>
      {children}
    </div>
  );
}
