import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; type?: "checkbox" | "radio" };

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox({ label, className, type = "checkbox", ...rest }, ref) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink", className)}>
      <input ref={ref} type={type} className="size-4 shrink-0 accent-[#7A1F2B]" {...rest} />
      <span>{label}</span>
    </label>
  );
});
