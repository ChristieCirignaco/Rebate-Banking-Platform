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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getStats } from "../mock-data";
import { DateRangeSelect, StatTile } from "../shared";
import type { TxnSummaryPoint } from "../types";

const chartConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-2)" },
  failed: { label: "Failed", color: "var(--chart-3)" },
} satisfies ChartConfig;

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 90,
};

const formatDay = (value: unknown) =>
  new Date(String(value)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const SERIES = ["completed", "pending", "failed"] as const;

// Stats include icon components, which can't cross the server->client boundary as
// props — so this client tab reads them directly (the data is static).
export function UserStatsTab({ summary }: { summary: TxnSummaryPoint[] }) {
  const stats = getStats();
  const [range, setRange] = React.useState("30d");
  const data = summary.slice(-(RANGE_DAYS[range] ?? 30));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatTile key={stat.label} stat={stat} />
        ))}
      </div>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardAction>
            <DateRangeSelect value={range} onChange={setRange} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full"
          >
            <AreaChart data={data} margin={{ left: 4, right: 8 }}>
              <defs>
                {SERIES.map((key) => (
                  <linearGradient
                    key={key}
                    id={`fill-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.7}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.06}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={formatDay}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tickMargin={4}
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
              <ChartLegend content={<ChartLegendContent />} />
              {SERIES.map((key) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  stackId="a"
                  stroke={`var(--color-${key})`}
                  fill={`url(#fill-${key})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
