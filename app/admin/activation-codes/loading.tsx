import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// This page doesn't use AdminSection — StatCards carries its own padding, so the header and
// body are siblings (see app/admin/activation-codes/page.tsx). The header is inlined here to
// match that, including the "Back to Users" button on the right.
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <StatCardsSkeleton />

      <div className="px-4 lg:px-6">
        <TableSkeleton rows={8} columns={5} search />
      </div>
    </div>
  );
}
