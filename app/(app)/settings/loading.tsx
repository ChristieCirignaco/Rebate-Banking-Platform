import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/settings/page.tsx — one of the three user screens that renders separate
// mobile and desktop trees rather than the shared inner-page shell, so the skeleton splits the
// same way. Row count matches the settings hub's link list (Profile, Security, Identity,
// Wallets, Notifications); flags can trim it, which only shortens the list.
function LinkRowsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
          <Skeleton className="size-5 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <>
      {/* Mobile — centred title between the back circle and its balancing spacer */}
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-5 pb-28 lg:hidden">
        <header className="flex items-center gap-3 py-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <Skeleton className="mx-auto h-4 w-20" />
          <span className="size-10 shrink-0" aria-hidden />
        </header>
        <LinkRowsSkeleton />
        <div className="mt-6 flex justify-center">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Desktop — dark-scoped card in the dark content panel */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <LinkRowsSkeleton />
            <div className="mt-6">
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
