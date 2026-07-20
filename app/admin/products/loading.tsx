import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// Like the dashboard and activation codes, StatCards carries its own padding here, so the
// header and body are siblings rather than nested in one padded wrapper.
export default function Loading() {
  return (
    <>
      <div className="flex flex-col gap-2 px-4 lg:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <StatCardsSkeleton />

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <TableSkeleton rows={8} columns={4} avatar filters />
      </div>
    </>
  );
}
