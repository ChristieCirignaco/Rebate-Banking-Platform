import { AdminSectionSkeleton, FormSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// The component editor: the schema-driven content form, then a table per repeatable collection.
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <FormSkeleton fields={6} />
      <TableSkeleton rows={5} columns={3} />
    </AdminSectionSkeleton>
  );
}
