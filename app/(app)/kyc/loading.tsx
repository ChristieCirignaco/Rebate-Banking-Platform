import {
  FormSkeleton,
  PageShellSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/kyc/page.tsx in its common case — the submission form. The status panels
// (approved/pending/rejected) are a single short banner, so skeletoning those instead would leave
// the far more common form arriving into a gap.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        {/* The template's document/detail fields. */}
        <FormSkeleton fields={3} submit={false} />

        {/* Optional note — a textarea rather than a single-line control. */}
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        <Skeleton className="mt-1 h-12 w-full rounded-xl" />
      </div>
    </PageShellSkeleton>
  );
}
