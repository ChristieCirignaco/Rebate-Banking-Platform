import { FormSkeleton } from "@/components/admin/skeletons/admin-skeleton";

// One fallback for every /admin/settings/* tab. app/admin/settings/layout.tsx renders the
// heading and tab bar, and a layout sits outside its own loading boundary, so those stay put
// and only the form body swaps — no duplicated heading, no tab bar flicker between tabs.
export default function Loading() {
  return <FormSkeleton fields={8} columns={2} />;
}
