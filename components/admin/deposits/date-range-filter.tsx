"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DateRange {
  from: string; // yyyy-mm-dd or ""
  to: string;
}

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

// Two native date inputs — a dependency-free from/to range filter.
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-xs whitespace-nowrap">From</Label>
        <Input
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
          className="w-40"
          aria-label="From date"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-xs whitespace-nowrap">To</Label>
        <Input
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
          className="w-40"
          aria-label="To date"
        />
      </div>
    </div>
  );
}

// Inclusive day-range test against an ISO timestamp.
export function inRange(iso: string, range: DateRange): boolean {
  const day = iso.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}
