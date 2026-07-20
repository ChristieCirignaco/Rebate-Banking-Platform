import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={false}>
      <TableSkeleton
        rows={8}
        columns={3}
        avatar={true}
        search={false}
        filters={true}
        action={true}
      />
    </AdminSectionSkeleton>
  );
}
