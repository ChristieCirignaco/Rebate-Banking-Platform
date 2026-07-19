import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpRight,
  BadgePercent,
  Gift,
  HandCoins,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TransactionView, TxnIconKey } from "@/lib/dashboard/transactions";

// The icon each ledger source maps to. Colocated with the row so the view object stays a
// plain serializable value (it carries only the string `iconKey`, never a component).
export const TXN_ICONS: Record<TxnIconKey, LucideIcon> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  reversal: RotateCcw,
  adjustment: SlidersHorizontal,
  fee: Receipt,
  transfer: ArrowLeftRight,
  exchange: ArrowRightLeft,
  voucher: Ticket,
  request: HandCoins,
  rebate: BadgePercent,
  reward: Gift,
};

// One ledger row: circular source icon (green tint for credit, slate for debit), name +
// subtitle, and a right-aligned signed amount + relative time. Always a button that opens the
// details modal — Home and History render the same interactive row. (Home used to omit
// `onSelect` and degrade to an inert div, which is the bug this replaced: the rows looked
// tappable and did nothing.)
export function TransactionRow({
  txn,
  onSelect,
}: {
  txn: TransactionView;
  onSelect: (id: string) => void;
}) {
  const Icon = TXN_ICONS[txn.iconKey];
  const content = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          txn.positive
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
        )}
      >
        <Icon className="size-5" />
      </span>

      {/* Transaction title/subtitle carry recipient names, providers and memos — financial data
          that stays out of the translator. */}
      <div translate="no" className="notranslate min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {txn.title}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {txn.subtitle}
          {txn.pending ? " · Pending" : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-bold tabular-nums",
            txn.positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-900 dark:text-slate-100",
          )}
        >
          {txn.amountLabel}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{txn.timeLabel}</p>
      </div>
    </>
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(txn.id)}
      className="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      {content}
    </button>
  );
}
