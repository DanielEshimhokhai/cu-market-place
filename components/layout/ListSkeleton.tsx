import { Skeleton } from "@/components/ui/Skeleton";

/** Title + tabs + a bordered list of rows: the shape of orders, messages, notifications and seller tables. */
export function ListSkeleton({ rows = 6, tabs = true }: { rows?: number; tabs?: boolean }) {
  return (
    <div className="pt-6 md:pt-10">
      <Skeleton className="h-7 w-40" />
      {tabs && <Skeleton className="mt-5 h-10 w-full" />}
      <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3.5">
            <Skeleton className="size-12 rounded-control" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
