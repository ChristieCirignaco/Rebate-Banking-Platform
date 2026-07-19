import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/statistic/page.tsx: the range picker, the money in/out/net summary tile, then
// the two bordered chart sections. The chart blocks reserve their real heights — the area chart's
// 16/10 ratio and the source bars' row-driven box — so the page doesn't lurch when recharts draws.

function ChartSection({ plot }: { plot: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <Skeleton className={`w-full rounded-xl ${plot}`} />
    </section>
  );
}

export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4 pb-2">
        {/* Range select — the wallet select only appears on multi-currency accounts. */}
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Summary tile: money in, money out, transactions, then the ruled net row. */}
        <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <ChartSection plot="aspect-[16/10]" />
        <ChartSection plot="h-44" />
      </div>
    </PageShellSkeleton>
  );
}
