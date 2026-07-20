import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={true}>
      <TableSkeleton
        rows={7}
        columns={3}
        avatar={false}
        search={false}
        filters={false}
        action={true}
      />
    </AdminSectionSkeleton>
  );
}
