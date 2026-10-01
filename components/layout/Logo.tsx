import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="CU Marketplace home">
      <span aria-hidden className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-semibold tracking-tight text-white">
        cu
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Marketplace</span>
    </Link>
  );
}
