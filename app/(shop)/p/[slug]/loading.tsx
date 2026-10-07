import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6 pt-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 md:pt-10">
      <Skeleton className="-mx-4 aspect-[4/5] rounded-none md:mx-0 md:rounded-card" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-16 w-full rounded-card" />
        <Skeleton className="mt-4 h-11 w-full" />
        <Skeleton className="mt-4 h-48 w-full rounded-card" />
      </div>
    </div>
  );
}
