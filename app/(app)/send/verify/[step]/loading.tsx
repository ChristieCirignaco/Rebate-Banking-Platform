import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/send/verify/[step]/page.tsx. The only user screen that doesn't use the
// standard shell — it's a narrow, centred authorization card with a cancel X instead of a
// back-circle and title, so PageShellSkeleton would put the header in the wrong place. The body
// is VerifyStepForm: step counter, shield badge, title + hint, the "sending X to Y" summary
// pill, and the single code input with its submit.
export default function Loading() {
  return (
    <div className="mx-auto max-w-md px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg">
        <div className="flex items-center justify-end py-2 lg:pt-0">
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="size-12 rounded-full" />
          <div className="flex w-full flex-col items-center gap-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex w-full flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
