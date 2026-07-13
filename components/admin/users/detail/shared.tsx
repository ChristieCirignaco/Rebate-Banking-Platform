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
const ACTION_TINTS = {
  blue: "text-blue-600 hover:bg-blue-500/10 dark:text-blue-400",
  emerald: "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
  amber: "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
  rose: "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
  violet: "text-violet-600 hover:bg-violet-500/10 dark:text-violet-400",
} as const;

export type ActionTint = keyof typeof ACTION_TINTS;

export const ActionIconButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: ComponentType<{ className?: string }>;
    tint: ActionTint;
    label: string;
  } & React.ComponentProps<"button">
>(function ActionIconButton(
  { icon: Icon, tint, label, className, ...props },
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
        "size-10 rounded-full border",
        ACTION_TINTS[tint],
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
    ? formatCurrency(stat.value)
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
