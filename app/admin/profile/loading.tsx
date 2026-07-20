import { FormSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// One fallback for every /admin/profile/* tab — see app/admin/settings/loading.tsx for why
// this is body-only.
export default function Loading() {
  return <FormSkeleton fields={10} columns={2} />;
}
