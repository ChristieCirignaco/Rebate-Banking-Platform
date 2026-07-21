import {
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/notifications/page.tsx: the unread count / "Mark all as read" strip, then the
// bordered card of notice rows (bell chip + title, message and date).
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-36 shrink-0 rounded-xl" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 px-3.5 dark:border-slate-800">
          <RowsSkeleton count={6} />
        </div>
      </div>
    </PageShellSkeleton>
  );
}
