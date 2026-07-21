import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/support/[id]/page.tsx. Not a list: the body is a fixed-height chat column —
// subject/status header, alternating message bubbles, and the pinned attach/textarea/send composer
// — so it gets bespoke markup rather than RowsSkeleton, which would collapse the reply box.
const BUBBLES = [
  { mine: false, width: "w-56" },
  { mine: true, width: "w-40" },
  { mine: false, width: "w-64" },
  { mine: true, width: "w-32" },
];

export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[68vh]">
        {/* Thread header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden py-4 pr-1">
          {BUBBLES.map((bubble, index) => (
            <div
              key={index}
              className={`flex items-end gap-2.5 ${bubble.mine ? "flex-row-reverse" : ""}`}
            >
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div
                className={`flex max-w-[80%] min-w-0 flex-col gap-1 ${
                  bubble.mine ? "items-end" : "items-start"
                }`}
              >
                {!bubble.mine ? <Skeleton className="h-3 w-20" /> : null}
                <Skeleton className={`h-10 max-w-full rounded-2xl ${bubble.width}`} />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="flex items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="size-11 shrink-0 rounded-xl" />
        </div>
      </div>
    </PageShellSkeleton>
  );
}
