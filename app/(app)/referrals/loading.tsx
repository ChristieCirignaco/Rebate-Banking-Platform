import {
  CardsSkeleton,
  PageShellSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/referrals/page.tsx: four stacked sections — the copyable referral link, the
// expandable referrer summary card, the allowed/prohibited rules pair, and the earnings table.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-6">
        {/* Referral link */}
        <section className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-3 w-52 max-w-full" />
        </section>

        {/* Referrer summary card — collapsed, so only the header row occupies space */}
        <Skeleton className="h-20 w-full rounded-2xl" />

        {/* Program rules */}
        <section className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <CardsSkeleton count={2} columns={2} height="h-36" />
        </section>

        {/* Referral earnings */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-40 shrink-0" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </section>
      </div>
    </PageShellSkeleton>
  );
}
