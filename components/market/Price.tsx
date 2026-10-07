import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";

export function Price({ kobo, compareAt, size = "md", className }: { kobo: number; compareAt?: number | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const text = { sm: "text-sm", md: "text-[15px]", lg: "text-xl", xl: "text-2xl" }[size];
  return (
    <span className={cn("tabular inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("font-semibold tracking-tight text-ink", text)}>{formatNaira(kobo)}</span>
      {compareAt ? (
        <span className="text-xs text-faint line-through">
          <span className="sr-only">was </span>
          {formatNaira(compareAt)}
        </span>
      ) : null}
    </span>
  );
}
