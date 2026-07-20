import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSectionSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// Rows here are gateway cards (square logo tile, name, mode/status pills, configure button)
// rather than the standard record row, so the body stays bespoke — only the shell is shared.
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <Card className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-6 w-40 rounded-full sm:block" />
            <Skeleton className="hidden h-6 w-12 rounded-full sm:block" />
            <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
            <Skeleton className="ml-auto h-9 w-24 shrink-0" />
          </div>
        ))}
      </Card>
    </AdminSectionSkeleton>
  );
}
