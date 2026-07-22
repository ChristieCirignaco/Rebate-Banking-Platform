"use client";

import * as React from "react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UserStat } from "./types";

// Colored circular icon button used as a dialog trigger. forwardRef so it works as
// a `<DialogTrigger asChild>` / `<TooltipTrigger asChild>` child.
//
// Two looks off the same tint: the default GHOST (a colored icon on a transparent, bordered
// button — used by the product status actions) and, with `fill`, a SOLID button (white icon on
// a filled semantic color, CoreUI-style — used by the user-detail action row so each control
// reads as its own colored button).
const ACTION_TINTS = {
  blue: "text-blue-600 hover:bg-blue-500/10 dark:text-blue-400",
  emerald: "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
  amber: "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
  rose: "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
  violet: "text-violet-600 hover:bg-violet-500/10 dark:text-violet-400",
  sky: "text-sky-600 hover:bg-sky-500/10 dark:text-sky-400",
  slate: "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300",
} as const;

export type ActionTint = keyof typeof ACTION_TINTS;

// Solid fills, keyed the same as ACTION_TINTS. Base text (white) and hover text are set on the
// button itself, so each entry only carries the background — hover included, since the ghost
// variant's `hover:bg-muted`/`hover:text-foreground` would otherwise win. Semantic names map to
// CoreUI: blue=primary, emerald=success, amber=warning, sky=info, slate=dark.
const SOLID_TINTS: Record<ActionTint, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  emerald: "bg-emerald-600 hover:bg-emerald-700",
  amber: "bg-amber-500 hover:bg-amber-600",
  rose: "bg-rose-600 hover:bg-rose-700",
  violet: "bg-violet-600 hover:bg-violet-700",
  sky: "bg-sky-500 hover:bg-sky-600",
  slate: "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500",
};

export const ActionIconButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: ComponentType<{ className?: string }>;
    tint: ActionTint;
    label: string;
    fill?: boolean;
  } & React.ComponentProps<"button">
>(function ActionIconButton(
  { icon: Icon, tint, label, fill = false, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      className={cn(
        "size-10 rounded-full",
        fill
          ? cn("border-0 text-white shadow-sm hover:text-white", SOLID_TINTS[tint])
          : cn("border", ACTION_TINTS[tint]),
        className,
      )}
      {...props}
    >
      <Icon className="size-4" />
    </Button>
  );
});

// Compact stat tile (icon + value + uppercase label). Used by the Statistics tab.
export function StatTile({ stat }: { stat: UserStat }) {
  const Icon = stat.icon;
  const value = stat.isCurrency
    ? formatCurrency(stat.value, stat.currency)
    : formatNumber(stat.value);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-muted-foreground size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tabular-nums">{value}</div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            {stat.label}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Empty-state block for tables/lists.
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-6" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

// Preset date-range picker (a Select for the mock; swap for a calendar range later).
export const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 3 months" },
  { value: "all", label: "All time" },
] as const;

// A range value -> the epoch-ms lower bound to filter rows by, or null for "all" (no bound).
// Shared so the Transactions and Activity tabs filter their lists consistently.
export function rangeCutoffMs(range: string): number | null {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : null;
  return days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;
}

export function DateRangeSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={cn("w-40", className)}
        aria-label="Select date range"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {DATE_RANGES.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
