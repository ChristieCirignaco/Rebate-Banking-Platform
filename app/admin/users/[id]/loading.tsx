import { Skeleton } from "@/components/ui/skeleton";
import { DetailSkeleton, FormSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// app/admin/users/[id]/page.tsx renders a bare h1 (no description, no AdminSection) over the
// user detail view, so the header is inlined rather than using AdminSectionSkeleton.
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Skeleton className="h-8 w-72" />
      <DetailSkeleton
        main={
          <>
            <FormSkeleton fields={8} columns={2} />
            <TableSkeleton rows={6} columns={4} />
          </>
        }
        aside={
          <>
            <FormSkeleton fields={3} footer={false} />
            <FormSkeleton fields={2} />
          </>
        }
      />
    </div>
  );
}
