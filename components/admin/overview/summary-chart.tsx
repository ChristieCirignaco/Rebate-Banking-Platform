"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

// Single series -> one hue, no legend (the title names it).
const config = {
  value: { label: "Transactions", color: "var(--chart-1)" },
} satisfies ChartConfig;

const formatDay = (value: unknown) =>
  new Date(String(value)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function SummaryChart({ data }: { data: TimeSeriesPoint[] }) {
  const [range, setRange] = React.useState<RangeValue>("90d");
  const filtered = sliceByRange(data, range);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Transaction Summary</CardTitle>
        <CardAction>
          <ChartRangeSelect value={range} onChange={setRange} />
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
            No transaction data for this period.
          </div>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[260px] w-full"
          >
            <AreaChart data={filtered} margin={{ left: 4, right: 8 }}>
              <defs>
                <linearGradient
                  id="fillTransactions"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.08}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatDay}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
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
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillTransactions)"
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
