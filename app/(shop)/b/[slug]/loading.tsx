import { ProductGridSkeleton } from "@/components/market/skeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="pt-6 md:pt-10">
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-card" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="mt-8 mb-6 h-10 w-full" />
      <ProductGridSkeleton count={10} />
    </div>
  );
}
