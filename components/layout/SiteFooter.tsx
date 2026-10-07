import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 hidden border-t border-line md:block">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-6 text-xs text-muted">
        <p>CU Marketplace is a student-run marketplace for the Covenant University community. Not an official university service.</p>
        <nav className="flex shrink-0 gap-4">
          <Link href="/safety" className="hover:text-ink">Safety tips</Link>
          <Link href="/businesses" className="hover:text-ink">Businesses</Link>
          <Link href="/locations" className="hover:text-ink">Campus map</Link>
        </nav>
      </div>
    </footer>
  );
}
