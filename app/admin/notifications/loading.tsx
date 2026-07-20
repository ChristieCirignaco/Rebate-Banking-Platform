import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSectionSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// A divided feed of two-line entries (icon, title + preview, timestamp) rather than a table,
// so the body stays bespoke — only the shell is shared.
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Card className="flex flex-col divide-y p-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" />
          </div>
        ))}
      </Card>
    </AdminSectionSkeleton>
  );
}
