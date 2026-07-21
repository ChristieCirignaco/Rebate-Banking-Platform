import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <TableSkeleton rows={5} columns={3} action />
      <TableSkeleton rows={4} columns={3} action />
    </AdminSectionSkeleton>
  );
}
