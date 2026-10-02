import Link from "next/link";
import type { ReactNode } from "react";

export function StatTile({ label, value, detail, href }: { label: string; value: ReactNode; detail?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="tabular mt-1 text-[22px] leading-tight font-semibold tracking-tight text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </>
  );
  const cls = "block rounded-card border border-line bg-surface p-4";
  return href ? <Link href={href} className={`${cls} hover:border-line-strong`}>{body}</Link> : <div className={cls}>{body}</div>;
}
