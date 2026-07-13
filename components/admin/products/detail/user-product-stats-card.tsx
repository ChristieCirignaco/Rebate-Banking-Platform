import type { ComponentType } from "react";
import { Box, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UserProductStats } from "../types";

const TINTS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function MiniStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tint: keyof typeof TINTS;
}) {
  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          TINTS[tint],
        )}
      >
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums">
          {formatNumber(value)}
        </div>
        <div className="text-muted-foreground text-xs tracking-wide uppercase">
          {label}
        </div>
      </div>
    </div>
  );
}

export function UserProductStatsCard({ stats }: { stats: UserProductStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User&apos;s Product Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat icon={Box} label="Total" value={stats.total} tint="blue" />
          <MiniStat
            icon={Clock}
            label="Pending"
            value={stats.pending}
            tint="amber"
          />
          <MiniStat
            icon={CheckCircle2}
            label="Approved"
            value={stats.approved}
            tint="emerald"
          />
          <MiniStat
            icon={XCircle}
            label="Rejected"
            value={stats.rejected}
            tint="rose"
          />
        </div>
      </CardContent>
    </Card>
  );
}
