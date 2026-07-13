"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  HandCoins,
  Package,
  PackageCheck,
  PackageX,
  Send,
  Ticket,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

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
import { DateRangeSelect, StatTile } from "../shared";
import type { TxnSummaryPoint, UserStat } from "../types";

// Static stat definitions (icons + labels stay client-side; values arrive as data).
const STAT_DEFS: { label: string; icon: UserStat["icon"]; isCurrency?: boolean }[] = [
  { label: "Total Trx", icon: ArrowLeftRight },
  { label: "Completed Trx", icon: CheckCircle2 },
  { label: "Pending Trx", icon: Clock },
  { label: "Failed Trx", icon: XCircle },
  { label: "Deposit", icon: Banknote, isCurrency: true },
  { label: "Send Money", icon: Send, isCurrency: true },
  { label: "Request Money", icon: HandCoins, isCurrency: true },
  { label: "Exchange Money", icon: ArrowLeftRight, isCurrency: true },
  { label: "Payment", icon: CreditCard, isCurrency: true },
  { label: "Withdraw", icon: Banknote, isCurrency: true },
  { label: "Voucher", icon: Ticket, isCurrency: true },
  { label: "Reward", icon: Gift, isCurrency: true },
  { label: "Total Wallets", icon: Wallet },
  { label: "Total Balance", icon: Wallet, isCurrency: true },
  { label: "Total Products", icon: Package },
  { label: "Pending Products", icon: Package },
  { label: "Approved Products", icon: PackageCheck },
  { label: "Rejected Products", icon: PackageX },
  { label: "Support Tickets", icon: Ticket },
  { label: "Referrals Made", icon: Users },
];

const chartConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-2)" },
  failed: { label: "Failed", color: "var(--chart-3)" },
} satisfies ChartConfig;

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, all: 90 };
const SERIES = ["completed", "pending", "failed"] as const;

const formatDay = (value: unknown) =>
  new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function UserStatsTab({
  statValues,
  statCurrency,
  summary,
}: {
  statValues: Record<string, number>;
  statCurrency: string;
  summary: TxnSummaryPoint[];
}) {
  const [range, setRange] = React.useState("30d");
  const data = summary.slice(-(RANGE_DAYS[range] ?? 30));

  const stats: UserStat[] = STAT_DEFS.map((def) => ({
    label: def.label,
    icon: def.icon,
    isCurrency: def.isCurrency,
    currency: def.isCurrency ? statCurrency : undefined,
    value: statValues[def.label] ?? 0,
  }));

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
          <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 8 }}>
              <defs>
                {SERIES.map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.06} />
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
              <YAxis tickLine={false} axisLine={false} width={36} tickMargin={4} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={formatDay} indicator="dot" />}
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
