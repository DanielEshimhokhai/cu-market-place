import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const controlClass = cn(
  "w-full rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint",
  "transition-colors duration-150 outline-none focus:border-ink focus-visible:outline-none",
  "aria-[invalid=true]:border-danger disabled:bg-subtle disabled:text-muted",
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(controlClass, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(controlClass, "min-h-24 py-2 leading-6", className)} {...rest} />;
});

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236B6662' stroke-width='1.75' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, style, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(controlClass, "h-10 appearance-none bg-[right_10px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: chevron, ...style }}
      {...rest}
    >
      {children}
    </select>
  );
});
