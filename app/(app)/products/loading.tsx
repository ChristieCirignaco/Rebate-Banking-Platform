import { Skeleton } from "@/components/ui/skeleton";
import { RowsSkeleton } from "@/components/app/skeletons/page-skeleton";

// Mirrors app/(app)/products/page.tsx, which renders ProductsContent twice — a light mobile
// tree and a dark-scoped desktop one at a wider max-w-4xl — so the skeleton splits the same way.
// Body order follows ProductsContent: header row, the four stat tiles, the list, pagination.
function ProductsBodySkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-4 lg:pt-0">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-48 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>

      <div className="mt-4">
        <RowsSkeleton count={5} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <>
      {/* Mobile */}
      <div className="mx-auto max-w-2xl px-5 pb-24 lg:hidden">
        <ProductsBodySkeleton />
      </div>

      {/* Desktop */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-4xl">
          <ProductsBodySkeleton />
        </div>
      </div>
    </>
  );
}
