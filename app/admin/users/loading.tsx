import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton description={true} action={true}>
      <TableSkeleton
        rows={10}
        columns={4}
        avatar={true}
        search={true}
        filters={false}
        action={true}
      />
    </AdminSectionSkeleton>
  );
}
