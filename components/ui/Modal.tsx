"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Render as a bottom sheet on small screens. */
  sheet?: boolean;
  className?: string;
};

export function Modal({ open, onClose, title, children, footer, sheet = false, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cn(
        "m-auto max-h-[85vh] w-[min(92vw,480px)] max-w-none overflow-hidden rounded-card bg-surface p-0 text-ink shadow-overlay",
        "backdrop:bg-ink/40",
        sheet && "max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          {sheet && <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-line sm:hidden" />}
          <header className="flex items-center justify-between gap-4 px-4 pt-3 pb-2">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 inline-flex size-9 items-center justify-center rounded-control text-muted hover:bg-subtle hover:text-ink"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && <footer className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function BottomSheet(props: Omit<Props, "sheet">) {
  return <Modal {...props} sheet />;
}
