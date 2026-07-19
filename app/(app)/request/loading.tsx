import {
  FormSkeleton,
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/request/page.tsx: shell header, then RequestForm's wallet / amount / reason
// fields and, under them, the "Your requests" history the page renders whenever the user has any.
// A first-time user has no history and the real page will be shorter — but that's the rarer state,
// and holding the space is what stops the common case from jumping when the list lands.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <FormSkeleton fields={3} />
      <div className="mt-8 flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <RowsSkeleton count={3} />
      </div>
    </PageShellSkeleton>
  );
}
