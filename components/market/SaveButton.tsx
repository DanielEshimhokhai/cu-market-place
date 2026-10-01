"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleSavedProduct } from "@/lib/actions/saved";
import { useToast } from "@/components/ui/Toast";

type Props = { productId: string; saved: boolean; variant?: "overlay" | "button"; className?: string };

export function SaveButton({ productId, saved, variant = "overlay", className }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      setOptimistic(!optimistic);
      const r = await toggleSavedProduct(productId);
      if (r.requiresAuth) {
        router.push(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!r.ok) toast.show("Couldn't update saved items. Try again.", { tone: "danger" });
      else router.refresh();
    });
  };

  const label = optimistic ? "Remove from saved" : "Save";
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={optimistic}
        aria-label={label}
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface transition-colors duration-150 hover:bg-subtle",
          optimistic ? "text-accent" : "text-ink",
          className,
        )}
      >
        <Heart size={18} strokeWidth={1.75} fill={optimistic ? "currentColor" : "none"} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={label}
      className={cn(
        "absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-surface/90 transition-colors duration-150 hover:bg-surface",
        optimistic ? "text-accent" : "text-ink",
        className,
      )}
    >
      <Heart size={16} strokeWidth={1.75} fill={optimistic ? "currentColor" : "none"} />
    </button>
  );
}
