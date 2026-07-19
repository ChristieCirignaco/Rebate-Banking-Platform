import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/products/new/page.tsx: the form opens on a single line-item card (name, then
// price/quantity side by side, then the dashed image dropzone), followed by the add-row and
// submit buttons. One card is the right count — the rest only exist once the user adds them.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <Skeleton className="h-3 w-20" />

          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="mt-1 h-12 w-full rounded-xl" />
      </div>
    </PageShellSkeleton>
  );
}
