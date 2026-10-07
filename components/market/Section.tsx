import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Section({ title, href, linkLabel = "See all", aside, children, className, id }: {
  title: string; href?: string; linkLabel?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} className={cn("pt-8 md:pt-10", className)}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
          {aside && <div className="mt-0.5">{aside}</div>}
        </div>
        {href && (
          <Link href={href} className="inline-flex shrink-0 items-center text-[13px] text-muted hover:text-ink">
            {linkLabel}
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
