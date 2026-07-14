import { Badge } from "@/components/ui/badge";
import type { ChargeType, DepositStatus } from "./types";

const STATUS_STYLES: Record<DepositStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className:
      "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "COMPLETED",
    className:
      "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  canceled: {
    label: "CANCELED",
    className:
      "border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
  failed: {
    label: "FAILED",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}

export function MethodStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
      ACTIVE
    </Badge>
  ) : (
    <Badge className="border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400">
      INACTIVE
    </Badge>
  );
}

// "2.9%" or "$5.00"-style charge, plus a small type sublabel.
export function chargeLabel(
  chargeType: ChargeType,
  chargeValue: number,
  symbol: string,
): string {
  return chargeType === "percent" ? `${chargeValue}%` : `${symbol}${chargeValue}`;
}

export function RateTypeLabel({ chargeType }: { chargeType: ChargeType }) {
  return (
    <span className="text-muted-foreground text-xs capitalize">{chargeType}</span>
  );
}
