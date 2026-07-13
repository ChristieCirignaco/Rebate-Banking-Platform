import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StatTint, StatWidget } from "./types";

// Soft tinted icon backgrounds. Static class strings so Tailwind can see them.
const TINTS: Record<StatTint, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

export function StatCard({ widget }: { widget: StatWidget }) {
  const Icon = widget.icon;
  const value = widget.isCurrency
    ? formatCurrency(widget.value, widget.currency)
    : formatNumber(widget.value);

  return (
    <Card className="relative p-5">
      <Link
        href={widget.href}
        aria-label={`Open ${widget.label}`}
        className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors"
      >
        <ArrowUpRight className="size-4" />
      </Link>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            TINTS[widget.tint],
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold tabular-nums">
            {value}
          </div>
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {widget.label}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StatCards({ widgets }: { widgets: StatWidget[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {widgets.map((widget) => (
        <StatCard key={widget.label} widget={widget} />
      ))}
    </div>
  );
}
