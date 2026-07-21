import { Skeleton } from "@/components/ui/skeleton";
import { RowsSkeleton } from "@/components/app/skeletons/page-skeleton";

// Mirrors app/(app)/dashboard/page.tsx, which renders BOTH compositions and lets CSS pick one —
// so the skeleton has to do the same, or one breakpoint gets no fallback at all.
//
// The mobile hero is a dark gradient panel, so its skeletons are translucent white rather than
// the default muted grey; on that background the normal Skeleton tint is invisible.
export default function Loading() {
  return (
    <>
      {/* Mobile — dark hero over a white sheet (MobileHome) */}
      <div className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col bg-white lg:hidden dark:bg-slate-950">
        <section
          className="px-5 pt-6 pb-10"
          style={{
            background: "linear-gradient(165deg,#2748a0 0%,#1a2f66 46%,#0f1a38 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Skeleton className="size-10 shrink-0 rounded-full bg-white/15" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-3 w-20 bg-white/15" />
                <Skeleton className="h-4 w-28 bg-white/15" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="size-9 rounded-full bg-white/15" />
              <Skeleton className="size-9 rounded-full bg-white/15" />
            </div>
          </div>

          {/* BalanceHero: label, 4xl amount + eye toggle, delta line */}
          <div className="mt-6">
            <Skeleton className="h-4 w-24 bg-white/15" />
            <div className="mt-1 flex items-center justify-between gap-3">
              <Skeleton className="h-10 w-48 bg-white/15" />
              <Skeleton className="size-9 shrink-0 rounded-full bg-white/15" />
            </div>
            <Skeleton className="mt-2 h-4 w-32 bg-white/15" />
          </div>

          {/* QuickActions: two flexible pills + one square button */}
          <div className="mt-6 flex items-center gap-3">
            <Skeleton className="h-12 flex-1 rounded-2xl bg-white/15" />
            <Skeleton className="h-12 flex-1 rounded-2xl bg-white/15" />
            <Skeleton className="size-12 shrink-0 rounded-2xl bg-white/15" />
          </div>
        </section>

        <section className="-mt-6 flex-1 rounded-t-[28px] bg-white px-5 pt-5 pb-28 dark:bg-slate-950">
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mt-3 h-24 w-full rounded-2xl" />

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <RowsSkeleton count={5} />
          </div>
        </section>
      </div>

      {/* Desktop — two-column top row, then a full-width transactions panel (DesktopHome) */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-2xl" />
              ))}
              <Skeleton className="col-span-2 h-24 w-full rounded-2xl" />
            </div>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-16" />
            </div>
            <RowsSkeleton count={5} />
          </section>
        </div>
      </div>
    </>
  );
}
