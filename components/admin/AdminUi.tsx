"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/cn";

export function AdminNav({ openReports }: { openReports: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/reports", label: "Reports", count: openReports },
    { href: "/admin/listings", label: "Listings" },
    { href: "/admin/sellers", label: "Sellers" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/reviews", label: "Reviews" },
    { href: "/admin/categories", label: "Categories" },
  ];
  return (
    <nav aria-label="Admin">
      <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:flex-col md:gap-0.5 md:border-0 md:px-0">
        {items.map((i) => {
          const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-10 items-center justify-between gap-3 border-b-2 px-2 text-sm md:mb-0 md:rounded-control md:border-b-0 md:px-3",
                  active ? "border-accent font-medium text-ink md:bg-subtle" : "border-transparent text-muted hover:text-ink md:hover:bg-subtle",
                )}
              >
                {i.label}
                {!!i.count && <span className="tabular rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{i.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Runs a bound server action. With `confirm`, asks first; with `withNote`, collects an optional
 * note that's passed as the action's last argument.
 */
export function ActionButton({ action, label, variant = "secondary", confirm, withNote }: {
  action: (note?: string) => Promise<ActionResult>;
  label: string;
  variant?: ButtonVariant;
  confirm?: { title: string; body: string; cta: string };
  withNote?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const run = () =>
    start(async () => {
      const r = await action(withNote ? note : undefined);
      setOpen(false);
      if (!r.ok) toast.show(r.error ?? "Something went wrong.", { tone: "danger" });
      else {
        if (r.message) toast.show(r.message);
        router.refresh();
      }
    });

  if (!confirm && !withNote) {
    return <Button size="sm" variant={variant} loading={pending} onClick={run}>{label}</Button>;
  }
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={confirm?.title ?? label}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={variant === "danger" ? "danger" : "primary"} loading={pending} onClick={run}>{confirm?.cta ?? label}</Button>
          </div>
        }
      >
        {confirm && <p className="text-sm text-muted">{confirm.body}</p>}
        {withNote && (
          <Field label={withNote} htmlFor="admin-note" optional className="mt-4">
            <Textarea id="admin-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
      </Modal>
    </>
  );
}

export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
      <span className="tabular">Page {page} of {pages} · {total.toLocaleString("en-NG")} total</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-subtle">Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-subtle">Next</Link>}
      </div>
    </div>
  );
}
