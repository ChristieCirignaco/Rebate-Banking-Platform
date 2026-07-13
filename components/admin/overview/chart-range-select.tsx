"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeSeriesPoint } from "./types";

export type RangeValue = "7d" | "30d" | "90d";

export const RANGE_LABELS: Record<RangeValue, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 3 months",
};

const RANGE_DAYS: Record<RangeValue, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

// Returns the trailing slice of a daily series for the selected range.
export function sliceByRange(
  data: TimeSeriesPoint[],
  range: RangeValue,
): TimeSeriesPoint[] {
  return data.slice(-RANGE_DAYS[range]);
}

export function ChartRangeSelect({
  value,
  onChange,
  options = ["7d", "30d", "90d"],
}: {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  options?: RangeValue[];
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as RangeValue)}
    >
      <SelectTrigger size="sm" className="w-36" aria-label="Select date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {RANGE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
