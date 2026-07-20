import { AdminSectionSkeleton, DetailSkeleton, FormSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// The page composition editor: ordered section list on the left, settings + component library
// on the right.
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <DetailSkeleton
        main={<TableSkeleton rows={7} columns={3} />}
        aside={
          <>
            <FormSkeleton fields={4} />
            <TableSkeleton rows={5} columns={2} search />
          </>
        }
      />
    </AdminSectionSkeleton>
  );
}
