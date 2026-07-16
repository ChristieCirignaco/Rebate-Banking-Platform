"use client";

import { useState } from "react";
import { ChartColumn } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/format";
import type { StatCurrencyView, StatRange, StatRangeView, StatisticData } from "@/lib/statistic";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

// The /statistic screen body. The server hands over every range for every wallet currency
// already bucketed and formatted (lib/statistic.ts), so switching range/currency is instant and
// needs no refetch — this component only picks which precomputed slice to draw.
//
// IMPORTANT: import only TYPES from @/lib/statistic — it reaches for prisma and must never be
// pulled into the client bundle.

const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

// Typed against StatRange so these can never drift from the ranges the read layer buckets.
const RANGE_OPTIONS: { value: StatRange; label: string }[] = [
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

// Credit green / debit red — the same semantics the ledger rows use elsewhere in the app.
const activityConfig = {
  moneyIn: { label: "Money in", color: "var(--color-emerald-500)" },
  moneyOut: { label: "Money out", color: "var(--color-red-500)" },
} satisfies ChartConfig;

const sourceConfig = {
  amount: { label: "Volume", color: "var(--color-blue-500)" },
} satisfies ChartConfig;

export function StatisticView({ data }: { data: StatisticData }) {
  const [range, setRange] = useState<StatRange>(30);
  const [currency, setCurrency] = useState(
    () => (data.currencies.find((c) => c.isDefault) ?? data.currencies[0])?.currency ?? "",
  );

  if (data.currencies.length === 0) {
    return (
      <EmptyState
        title="No wallets yet"
        detail="Charts appear once you have a wallet with some activity."
      />
    );
  }

  const active = data.currencies.find((c) => c.currency === currency) ?? data.currencies[0];
  const view = active.ranges[`${range}`];

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Controls
        currencies={data.currencies}
        active={active}
        range={range}
        onCurrencyChange={setCurrency}
        onRangeChange={setRange}
      />

      {view.count === 0 ? (
        <EmptyState
          title="No activity in this range"
          detail={`Your ${active.currency} wallet has no transactions in the last ${range} days.`}
        />
      ) : (
        <>
          <Summary view={view} />
          <ActivityChart view={view} currency={active.currency} />
          <SourceChart view={view} currency={active.currency} />
        </>
      )}
    </div>
  );
}

function Controls({
  currencies,
  active,
  range,
  onCurrencyChange,
  onRangeChange,
}: {
  currencies: StatCurrencyView[];
  active: StatCurrencyView;
  range: StatRange;
  onCurrencyChange: (currency: string) => void;
  onRangeChange: (range: StatRange) => void;
}) {
  return (
    <div className={cn("grid gap-3", currencies.length > 1 && "sm:grid-cols-2")}>
      {/* One currency at a time: amounts in different currencies are not comparable, so
          mixing them into a single series would be meaningless. */}
      {currencies.length > 1 ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Wallet</span>
          <select
            className={SELECT}
            value={active.currency}
            onChange={(event) => onCurrencyChange(event.target.value)}
          >
            {currencies.map((c) => (
              <option key={c.currency} value={c.currency}>
                {c.currency} — {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-500">Range</span>
        <select
          className={SELECT}
          value={range}
          onChange={(event) => onRangeChange(Number(event.target.value) as StatRange)}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Summary({ view }: { view: StatRangeView }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
      <div className="flex justify-between text-slate-500">
        <span>Money in</span>
        <span className="text-emerald-600">{view.inLabel}</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Money out</span>
        <span className="text-red-600">{view.outLabel}</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Transactions</span>
        <span>{view.count}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
        <span>Net</span>
        <span className={view.netPositive ? "text-emerald-600" : "text-red-600"}>
          {view.netLabel}
        </span>
      </div>
    </div>
  );
}

function ActivityChart({ view, currency }: { view: StatRangeView; currency: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Money in vs money out</h2>
        <p className="text-xs text-slate-500">Daily totals for your {currency} wallet.</p>
      </div>

      <ChartContainer config={activityConfig} className="aspect-[16/10] w-full">
        <AreaChart data={view.days} margin={{ left: 4, right: 4, top: 4 }}>
          <defs>
            {(["moneyIn", "moneyOut"] as const).map((key) => (
              <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.3} />
                <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickCount={4}
            tickFormatter={(value: number) => formatCurrency(value, currency)}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={moneyFormatter(currency, activityConfig)} />}
          />
          <Area
            dataKey="moneyIn"
            type="monotone"
            stroke="var(--color-moneyIn)"
            fill="url(#fill-moneyIn)"
            strokeWidth={2}
          />
          <Area
            dataKey="moneyOut"
            type="monotone"
            stroke="var(--color-moneyOut)"
            fill="url(#fill-moneyOut)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}

function SourceChart({ view, currency }: { view: StatRangeView; currency: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Where it moved</h2>
        <p className="text-xs text-slate-500">
          Total {currency} volume by transaction type — credits and debits both count.
        </p>
      </div>

      {/* One row per source, so the height follows the data rather than a fixed ratio
          (aspect-auto drops the aspect-video ChartContainer bakes in). */}
      <ChartContainer
        config={sourceConfig}
        className="aspect-auto w-full"
        style={{ height: `${Math.max(140, view.sources.length * 34 + 24)}px` }}
      >
        <BarChart data={view.sources} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={104}
            className="text-xs"
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent formatter={moneyFormatter(currency, sourceConfig)} />}
          />
          <Bar dataKey="amount" fill="var(--color-amount)" radius={4} barSize={18} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}

// ChartTooltipContent's default row prints a bare `toLocaleString()` number — every figure on
// this screen is money, so route it through formatCurrency. Taking over the row means drawing
// the colour indicator ourselves.
function moneyFormatter(currency: string, config: ChartConfig) {
  return function format(value: unknown, name: unknown, item: { color?: string }) {
    const key = String(name);
    return (
      <>
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: item?.color }}
        />
        <div className="flex flex-1 items-center justify-between gap-3 leading-none">
          <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
          <span className="text-foreground font-mono font-medium tabular-nums">
            {formatCurrency(Number(value), currency)}
          </span>
        </div>
      </>
    );
  };
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
      <ChartColumn className="size-6 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{detail}</p>
    </div>
  );
}
