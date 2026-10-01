import Image from "next/image";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/names";

type Size = 24 | 32 | 40 | 48 | 56 | 64;

type Props = { name: string; src?: string | null; size?: Size; square?: boolean; className?: string };

export function Avatar({ name, src, size = 32, square = false, className }: Props) {
  const shape = square ? "rounded-card" : "rounded-full";
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-cover", shape, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center bg-subtle font-medium text-muted", shape, className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  );
}
