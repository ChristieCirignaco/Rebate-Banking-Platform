import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/account/profile/page.tsx: the one settings card holding the avatar row, the
// nine profile fields (paired two-up from `sm`) and the right-aligned save button. Bespoke rather
// than FormSkeleton because these are default h-8 Inputs in a grid — a flat stack of h-12
// controls would leave the card the best part of twice too tall.

function Field() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}

function FieldPair() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field />
      <Field />
    </div>
  );
}

export default function Loading() {
  return (
    <PageShellSkeleton>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          {/* First/last name */}
          <FieldPair />
          {/* Email — read-only, spans the row */}
          <Field />
          {/* Username/date of birth, country/phone, gender/address */}
          <FieldPair />
          <FieldPair />
          <FieldPair />

          <div className="flex justify-end">
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </section>
    </PageShellSkeleton>
  );
}
