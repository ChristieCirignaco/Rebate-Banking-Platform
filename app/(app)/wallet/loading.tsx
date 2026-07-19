import {
  CardsSkeleton,
  PageShellSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/wallet/page.tsx: the header carries the "Add wallet" button, and the body is
// the one-line total strip above the grid of wallet cards (icon + balance + Manage).
export default function Loading() {
  return (
    <PageShellSkeleton action>
      <div className="flex flex-col gap-4 pb-2">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <CardsSkeleton count={4} columns={2} height="h-40" />
      </div>
    </PageShellSkeleton>
  );
}
