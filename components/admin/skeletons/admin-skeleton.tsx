import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared building blocks for the admin route-level `loading.tsx` fallbacks.
//
// A skeleton is only useful if it occupies the same space the real content will — otherwise the
// page visibly jumps when data arrives, which reads worse than showing nothing at all. So these
// mirror the real shells: AdminSectionSkeleton matches components/admin/admin-section.tsx, and
// StatCardsSkeleton matches components/admin/overview/stat-card.tsx (including its own
// px-4 lg:px-6, which is why StatCards is always a sibling of the padded body, never nested in
// it). Keeping them here means a change to AdminSection is a one-line change to its skeleton
// instead of a sweep across every loading.tsx that would inevitably drift.
//
// Mirrors the user-side equivalent at components/app/skeletons/page-skeleton.tsx.

/**
 * The `AdminSection` shell: padded column with a title (+ optional description and header-right
 * action) over the body. Pass the body shape as children.
 *
 * Do NOT use this for /admin/settings/* or /admin/profile/* — those segments have a layout.tsx
 * that renders the real title and tab bar, and a layout renders outside its own loading
 * boundary. Their `loading.tsx` should be the body shape alone, or the heading renders twice.
 */
export function AdminSectionSkeleton({
  description = true,
  action = false,
  children,
}: {
  description?: boolean;
  action?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          {description ? <Skeleton className="h-4 w-72" /> : null}
        </div>
        {action ? <Skeleton className="h-9 w-32" /> : null}
      </div>
      {children}
    </div>
  );
}

// Cycled so a row reads as distinct columns rather than a row of identical bars.
const CELL_WIDTHS = ["w-24", "w-20", "w-28", "w-16"];

/**
 * A card-wrapped list/table body — the shape behind most admin screens.
 *
 * `columns` counts the whole row: the first cell flexes to fill (the name/label column), the
 * rest are fixed-width pills that collapse on mobile the way the real tables do. The optional
 * bits mirror what the *-view components render around their tables: `search` is the input above
 * the list, `filters` the filter/summary strip, `action` the per-row button on the right.
 */
export function TableSkeleton({
  rows = 8,
  columns = 4,
  avatar = false,
  search = false,
  filters = false,
  action = false,
}: {
  rows?: number;
  columns?: number;
  avatar?: boolean;
  search?: boolean;
  filters?: boolean;
  action?: boolean;
}) {
  return (
    <>
      {search ? <Skeleton className="h-10 w-full max-w-xl rounded-lg" /> : null}
      {filters ? <Skeleton className="h-16 w-full rounded-xl" /> : null}
      <Card className="flex flex-col gap-3 p-4">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            {avatar ? <Skeleton className="size-9 shrink-0 rounded-full" /> : null}
            <Skeleton className="h-4 flex-1" />
            {Array.from({ length: Math.max(0, columns - 1) }).map((_, cell) => (
              <Skeleton
                key={cell}
                className={cn(
                  "hidden h-6 shrink-0 rounded-full sm:block",
                  CELL_WIDTHS[cell % CELL_WIDTHS.length],
                )}
              />
            ))}
            {action ? <Skeleton className="hidden h-9 w-28 shrink-0 sm:block" /> : null}
          </div>
        ))}
      </Card>
    </>
  );
}

/** A settings/profile form card: optional heading, label+input pairs, and a save button. */
export function FormSkeleton({
  fields = 6,
  columns = 1,
  heading = true,
  footer = true,
}: {
  fields?: number;
  columns?: 1 | 2;
  heading?: boolean;
  footer?: boolean;
}) {
  return (
    <Card>
      {heading ? (
        <CardHeader>
          <Skeleton className="h-6 w-44" />
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-4">
        <div className={cn("grid gap-4", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
          {Array.from({ length: fields }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        {footer ? <Skeleton className="h-9 w-32" /> : null}
      </CardContent>
    </Card>
  );
}

/** The 2/3 + 1/3 detail layout used by the user, product, page, and component editors. */
export function DetailSkeleton({ main, aside }: { main?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="flex flex-col gap-4 lg:col-span-2">{main}</div>
      <div className="flex flex-col gap-4">{aside}</div>
    </div>
  );
}

/**
 * The dashboard stat row. Carries its own horizontal padding to match `StatCards`, so render it
 * as a sibling of the padded body rather than inside `AdminSectionSkeleton`.
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/** A titled chart card. `height` must match the real chart's container or the page will jump. */
export function ChartSkeleton({
  height = "h-64",
  title = true,
}: {
  height?: string;
  title?: boolean;
}) {
  return (
    <Card>
      {title ? (
        <CardHeader className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
      ) : null}
      <CardContent>
        <Skeleton className={cn("w-full rounded-lg", height)} />
      </CardContent>
    </Card>
  );
}
