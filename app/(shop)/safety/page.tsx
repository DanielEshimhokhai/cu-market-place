import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Safety tips" };

const TIPS = [
  {
    title: "Meet somewhere public",
    body: "Pick up at busy spots like the Student Centre, a cafeteria or your hall reception. Avoid meeting in rooms or isolated areas, especially after dark.",
  },
  {
    title: "Inspect before you pay",
    body: "Check the item works and matches the listing: size, condition, and whether it's original. For electronics, test charging and power on the spot.",
  },
  {
    title: "Never pay before the seller confirms",
    body: "Wait until your order shows Confirmed. If someone pressures you to transfer money first, or offers a deal that seems too good, stop and report it.",
  },
  {
    title: "Keep conversations on CU Marketplace",
    body: "Messages here are linked to your order, which helps if something goes wrong. Be careful when someone asks you to move to another app early on.",
  },
  {
    title: "Exact pickup details stay private",
    body: "Sellers only show a general area publicly. They share exact pickup instructions with you after you order. Don't post your room number on a listing.",
  },
  {
    title: "Report problems",
    body: "Use Report on any listing, store or order to flag fraud, counterfeits, harassment or prohibited items. Moderators review every report. If you feel unsafe, contact campus security first.",
  },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl pt-8 md:pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Buying and selling safely</h1>
      <p className="mt-2 text-[15px] text-muted">A few habits that keep trades on campus simple and safe.</p>
      <ol className="mt-8 divide-y divide-line border-y border-line">
        {TIPS.map((tip, i) => (
          <li key={tip.title} className="flex gap-4 py-5">
            <span className="tabular w-5 shrink-0 pt-px text-sm text-faint">{i + 1}</span>
            <div>
              <h2 className="text-[15px] font-medium text-ink">{tip.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{tip.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-muted">
        Ready to look around? <Link href="/browse" className="font-medium text-accent hover:underline">Browse the marketplace</Link>
      </p>
    </div>
  );
}
