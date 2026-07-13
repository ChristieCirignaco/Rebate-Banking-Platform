"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/format";
import {
  ChartRangeSelect,
  sliceByRange,
  type RangeValue,
} from "./chart-range-select";
import type { TimeSeriesPoint } from "./types";

const formatDay = (value: unknown) =>
  new Date(String(value)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

// Reusable single-series bar chart card with its own date-range picker.
export function BarSeriesChart({
  title,
  data,
  color,
  seriesLabel,
}: {
  title: string;
  data: TimeSeriesPoint[];
  color: string;
  seriesLabel: string;
}) {
  const [range, setRange] = React.useState<RangeValue>("30d");
  const filtered = sliceByRange(data, range);
  const config = { value: { label: seriesLabel, color } } satisfies ChartConfig;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <ChartRangeSelect value={range} onChange={setRange} />
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            No data for this period.
          </div>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[220px] w-full"
          >
            <BarChart data={filtered} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatDay}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tickMargin={4}
                tickFormatter={(value) => formatNumber(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={formatDay}
                    indicator="dot"
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
