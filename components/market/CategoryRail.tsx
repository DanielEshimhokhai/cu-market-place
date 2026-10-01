import Link from "next/link";
import {
  BookOpen, Camera, Cpu, GraduationCap, Laptop, type LucideIcon, Package, Scissors, Shirt, ShoppingBasket, Sparkles,
  Tag, UtensilsCrossed, WashingMachine, Watch, Footprints, Wrench, PenLine,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  fashion: Shirt, food: UtensilsCrossed, electronics: Laptop, beauty: Sparkles, services: Wrench, books: BookOpen,
  accessories: Watch, "school-essentials": PenLine, thrift: Tag, shoes: Footprints, "hair-beauty": Scissors,
  photography: Camera, tech: Cpu, laundry: WashingMachine, tutoring: GraduationCap, other: Package,
};

export function categoryHref(c: Pick<Category, "slug" | "kind">) {
  return `/browse?category=${c.slug}`;
}

export function CategoryRail({ categories, className }: { categories: Category[]; className?: string }) {
  return (
    <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0", className)}>
      {categories.map((c) => {
        const Icon = CATEGORY_ICON[c.slug] ?? ShoppingBasket;
        return (
          <Link
            key={c.id}
            href={categoryHref(c)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink transition-colors duration-150 hover:border-line-strong hover:bg-subtle"
          >
            <Icon size={14} strokeWidth={1.75} className="text-muted" aria-hidden />
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}
