import {
  CardsSkeleton,
  FormSkeleton,
  PageShellSkeleton,
} from "@/components/app/skeletons/page-skeleton";

// Mirrors app/(app)/send/page.tsx: shell header, then SendForm's transfer-type tiles above the
// fields. Three tiles is the all-flags-on case; a disabled type reflows the real row to 2 or 1,
// which changes the width but not the height the skeleton is holding. The fields match the
// default (internal) tab — amount, recipient, note — since that's what renders first.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        <CardsSkeleton count={3} columns={3} height="h-20" />
        <FormSkeleton fields={3} />
      </div>
    </PageShellSkeleton>
  );
}
