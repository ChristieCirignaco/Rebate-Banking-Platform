import {
  ChipsSkeleton,
  PageShellSkeleton,
  RowsSkeleton,
} from "@/components/app/skeletons/page-skeleton";

// Mirrors app/(app)/transactions/page.tsx: shell header, then the filter chips and the
// day-grouped ledger rows.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <ChipsSkeleton count={6} />
      <RowsSkeleton count={7} />
    </PageShellSkeleton>
  );
}
