import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={true}>
      <TableSkeleton
        rows={5}
        columns={3}
        avatar={true}
        search={false}
        filters={false}
        action={true}
      />
    </AdminSectionSkeleton>
  );
}
