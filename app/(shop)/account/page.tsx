import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MailWarning, Shield, Store } from "lucide-react";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ResendButton } from "@/components/auth/PasswordForms";
import { AlertPrefs } from "@/components/market/AlertPrefs";
import { VerifiedBadge } from "@/components/market/VerifiedBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/auth/actions";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/time";
import { REPORT_REASONS } from "@/lib/validation/report";

export const metadata: Metadata = { title: "Account" };
const REASON = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-card border border-line bg-surface p-4 md:p-5">
      <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const viewer = await requireViewer("/account");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("phone, affiliation, notify_price_drop, notify_back_in_stock, notify_new_listings").eq("id", viewer.id).single(),
    supabase.from("reports").select("id, reason, status, created_at, target_type").eq("reporter_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-6 md:pt-10">
      {sp.password === "updated" && <p className="rounded-card border border-success/25 bg-success-soft px-4 py-3 text-sm">Password updated.</p>}

      <div className="flex items-center gap-4">
        <Avatar name={viewer.fullName || viewer.email} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight">{viewer.fullName || "Your account"}</h1>
          <p className="truncate text-sm text-muted">{viewer.email} · {profile?.affiliation === "staff" ? "Staff" : "Student"}</p>
          {viewer.cuVerified ? <VerifiedBadge label className="mt-1" /> : <Badge tone="warning" className="mt-1">Email not confirmed</Badge>}
        </div>
      </div>

      {!viewer.cuVerified && (
        <div className="flex flex-col gap-3 rounded-card border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2 text-sm">
            <MailWarning size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            Confirm your CU email to order and sell.
          </p>
          <ResendButton email={viewer.email} />
        </div>
      )}

      <Link href={viewer.businessId ? "/sell" : "/sell/onboarding"} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-line-strong">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-card bg-accent-soft text-accent">
          <Store size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{viewer.businessId ? "Seller dashboard" : "Start selling"}</span>
          <span className="block text-xs text-muted">{viewer.businessId ? "Orders, listings and store settings" : "Open a free store and sell to students on campus"}</span>
        </span>
        <ChevronRight size={16} className="text-faint" aria-hidden />
      </Link>

      {viewer.role === "admin" && (
        <Link href="/admin" className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-line-strong">
          <Shield size={18} strokeWidth={1.75} className="text-muted" aria-hidden />
          <span className="flex-1 text-sm font-medium">Moderation console</span>
          <ChevronRight size={16} className="text-faint" aria-hidden />
        </Link>
      )}

      <nav className="grid grid-cols-2 gap-2 text-sm md:hidden">
        {[["/messages", "Messages"], ["/notifications", "Notifications"], ["/orders", "Orders"], ["/saved", "Saved"]].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-card border border-line bg-surface px-4 py-3 hover:border-line-strong">{label}</Link>
        ))}
      </nav>

      <Card title="Profile">
        <ProfileForm fullName={viewer.fullName} phone={profile?.phone ?? null} />
      </Card>

      {profile && (
        <Card title="Notify me when…">
          <AlertPrefs layout="stack" initial={profile} />
          <p className="mt-2 text-xs text-muted">Order updates and messages are always on.</p>
        </Card>
      )}

      <Card title="Your reports" id="reports">
        {reports?.length ? (
          <ul className="divide-y divide-line text-sm">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span>{REASON[r.reason] ?? r.reason} <span className="text-muted">· {r.target_type} · {formatRelative(r.created_at)}</span></span>
                <Badge tone={r.status === "resolved" ? "success" : r.status === "dismissed" ? "neutral" : "accent"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">You haven&apos;t reported anything. Use “Report” on a listing, store or order if something&apos;s wrong.</p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link href="/safety" className="text-sm text-muted hover:text-ink">Safety tips</Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost">Sign out</Button>
        </form>
      </div>
    </div>
  );
}
