import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type Props = {
  title: string;
  body: string;
  action?: { label: string; href: string };
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ title, body, action, icon: Icon, className, children }: Props) {
  return (
    <div className={cn("rounded-card border border-dashed border-line-strong px-5 py-10 md:text-center", className)}>
      {Icon && <Icon size={20} strokeWidth={1.75} className="mb-3 text-muted md:mx-auto" aria-hidden />}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted md:mx-auto">{body}</p>
      {action && (
        <Button href={action.href} variant="secondary" size="sm" className="mt-4">
          {action.label}
        </Button>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
