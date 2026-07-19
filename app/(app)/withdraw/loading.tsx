import {
  FormSkeleton,
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/withdraw/page.tsx: shell header, then WithdrawView's two stacked sections —
// the "Withdrawal accounts" sub-header with its Add-account button plus the saved-account rows,
// and below them the form's wallet / account / amount fields. The sub-header row is bespoke
// because it sits inside the body, not in the page header PageShellSkeleton draws.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-32 shrink-0 rounded-xl" />
        </div>
        <RowsSkeleton count={2} />
        <FormSkeleton fields={3} />
      </div>
    </PageShellSkeleton>
  );
}
