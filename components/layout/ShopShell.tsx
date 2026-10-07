import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 md:px-6 md:pb-12">{children}</main>
      <SiteFooter />
      <MobileNav />
    </>
  );
}
