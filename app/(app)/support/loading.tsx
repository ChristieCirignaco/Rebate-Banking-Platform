import {
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/support/page.tsx: the "New ticket" button (full-width on mobile) above the
// bordered list of ticket rows. The composer is a dialog, so it costs no space here.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
        <div className="overflow-hidden rounded-2xl border border-slate-200 px-4">
          <RowsSkeleton count={5} />
        </div>
      </div>
    </PageShellSkeleton>
  );
}
