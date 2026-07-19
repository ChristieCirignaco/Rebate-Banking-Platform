import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/voucher/page.tsx: the Generate/Redeem button pair (both open modals, so they
// cost nothing more) above the "My Vouchers" table card — titled strip, header row, then rows.
export default function Loading() {
  return (
    <PageShellSkeleton maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <Skeleton className="h-3.5 w-full" />
          </div>
          <div className="flex flex-col divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16 shrink-0" />
                <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShellSkeleton>
  );
}
