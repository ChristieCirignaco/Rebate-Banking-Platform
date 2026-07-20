import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={true}>
      <TableSkeleton
        rows={9}
        columns={3}
        avatar={false}
        search={true}
        filters={false}
        action={true}
      />
    </AdminSectionSkeleton>
  );
}
