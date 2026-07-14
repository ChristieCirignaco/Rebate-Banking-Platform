import { Badge } from "@/components/ui/badge";
import type { TransactionStatus } from "./types";

const STATUS_STYLES: Record<TransactionStatus, { label: string; className: string }> = {
  completed: {
    label: "COMPLETED",
    className: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  pending: {
    label: "PENDING",
    className: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  failed: {
    label: "FAILED",
    className: "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const style = STATUS_STYLES[status] ?? {
    label: status.toUpperCase(),
    className: "border-transparent bg-slate-500/15 text-slate-600 dark:text-slate-300",
  };
  return <Badge className={style.className}>{style.label}</Badge>;
}

// Humanize a ledger source, e.g. "withdrawal_reversal" → "Withdrawal Reversal".
export function sourceLabel(source: string): string {
  return source
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function TransactionSourceBadge({ source }: { source: string }) {
  return <Badge variant="secondary">{sourceLabel(source)}</Badge>;
}
