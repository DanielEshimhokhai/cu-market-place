import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type Props = { products: ProductCardData[]; savedIds?: Set<string>; variant?: "grid" | "rail"; priorityCount?: number; className?: string };

export function ProductGrid({ products, savedIds, variant = "grid", priorityCount = 0, className }: Props) {
  if (variant === "rail") {
    return (
      <div className={cn("no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:px-0", className)}>
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} saved={savedIds?.has(p.id)} priority={i < priorityCount} className="w-[44vw] shrink-0 snap-start sm:w-[200px]" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} saved={savedIds?.has(p.id)} priority={i < priorityCount} />
      ))}
    </div>
  );
}
