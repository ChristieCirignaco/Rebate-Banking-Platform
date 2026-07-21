import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Shared building blocks for the user-side route-level `loading.tsx` fallbacks.
//
// A skeleton is only useful if it occupies the same space the real content will — otherwise the
// page visibly jumps when data arrives, which reads worse than a plain spinner. So these mirror
// the actual shells: PageShellSkeleton is the exact container/header markup that 18 of the 21
// user screens render inside (see app/(app)/transactions/page.tsx for the canonical copy), and
// the body helpers match the common content shapes. Keeping them here means a change to the page
// shell is a one-line change to its skeleton, instead of a 21-file sweep that will drift.

/**
 * The inner-page shell: centred card in the desktop content panel, full-width on mobile, with
 * the back-circle + title/subtitle header. `action` reserves space for a header-right control
 * (e.g. Wallets' "Add wallet" button).
 */
export function PageShellSkeleton({
  action = false,
  maxWidth = "max-w-2xl",
  children,
}: {
  action?: boolean;
  /** Must match the page's own container width — /voucher uses max-w-3xl, most use max-w-2xl.
   *  A mismatch here is visible as the content snapping wider/narrower on load. */
  maxWidth?: "max-w-2xl" | "max-w-3xl";
  children?: ReactNode;
}) {
  return (
    <div className={cn("mx-auto px-5 pb-24 lg:px-0 lg:pb-0", maxWidth)}>
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
          {action ? <Skeleton className="h-9 w-24 shrink-0 rounded-lg" /> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** List rows: leading circle, two stacked text lines, right-aligned trailing pair. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stacked form fields (label + control), with an optional full-width submit button. */
export function FormSkeleton({
  fields = 4,
  submit = true,
}: {
  fields?: number;
  submit?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      {submit ? <Skeleton className="mt-2 h-12 w-full rounded-xl" /> : null}
    </div>
  );
}

/** A grid of equal cards — wallets, stat tiles, product tiles. */
export function CardsSkeleton({
  count = 4,
  columns = 2,
  height = "h-28",
}: {
  count?: number;
  columns?: 1 | 2 | 3;
  height?: string;
}) {
  // The real grids these mirror (wallets, referral rules) stack to one column on phones and
  // only split at sm — matching that matters, since the skeleton is seen most on mobile.
  const cols =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={cn("grid gap-3", cols)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("w-full rounded-2xl", height)} />
      ))}
    </div>
  );
}

/** A horizontal strip of filter chips (Transaction History, Products). */
export function ChipsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden pb-1">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-20 shrink-0 rounded-full" />
      ))}
    </div>
  );
}
