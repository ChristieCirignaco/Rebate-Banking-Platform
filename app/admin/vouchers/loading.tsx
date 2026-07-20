import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={false}>
      <TableSkeleton
        rows={8}
        columns={5}
        avatar={false}
        search={false}
        filters={false}
        action={false}
      />
    </AdminSectionSkeleton>
  );
}
