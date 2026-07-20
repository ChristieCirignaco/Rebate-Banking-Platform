import {
  ChartSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/admin/skeletons/admin-skeleton";

// Mirrors app/admin/page.tsx: stat row, summary chart, wallet summary, the two bar charts,
// then the latest-transactions / latest-users pair. Chart heights match the real containers
// (SummaryChart h-[260px], BarSeriesChart h-[220px]) so the grid doesn't reflow on load.
export default function Loading() {
  return (
    <>
      <StatCardsSkeleton />

      <div className="px-4 lg:px-6">
        <ChartSkeleton height="h-[260px]" />
      </div>

      <div className="px-4 lg:px-6">
        <ChartSkeleton height="h-40" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <ChartSkeleton height="h-[220px]" />
        <ChartSkeleton height="h-[220px]" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <TableSkeleton rows={6} columns={3} />
        <TableSkeleton rows={5} columns={2} avatar />
      </div>
    </>
  );
}
