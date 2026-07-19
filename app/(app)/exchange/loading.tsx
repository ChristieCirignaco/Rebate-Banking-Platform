import {
  FormSkeleton,
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/exchange/page.tsx: shell header, then ExchangeForm — the From wallet, the
// circular swap button that sits between the two selects, the To wallet and the amount — followed
// by the "Recent exchanges" history the page renders whenever the user has converted before. The
// form is split across two FormSkeletons so the swap circle lands in the gap, as it does live.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-3">
        <FormSkeleton fields={1} submit={false} />
        <div className="flex justify-center">
          <Skeleton className="size-9 rounded-full" />
        </div>
        <FormSkeleton fields={2} />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <RowsSkeleton count={3} />
      </div>
    </PageShellSkeleton>
  );
}
