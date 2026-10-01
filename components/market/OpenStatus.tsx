import { cn } from "@/lib/cn";
import { openStatus, type OpeningHours } from "@/lib/hours";

export function OpenStatus({ hours, className }: { hours: OpeningHours | null; className?: string }) {
  const { open, label } = openStatus(hours);
  return (
    <span className={cn("inline-flex items-center gap-1.5", open ? "text-success" : "text-muted", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", open ? "bg-success" : "bg-line-strong")} />
      {label}
    </span>
  );
}
