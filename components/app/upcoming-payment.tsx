import Link from "next/link";
import { Clock3 } from "lucide-react";

// The pending-deposit strip. The dashboard only renders it when the user has a deposit still
// awaiting admin approval, so it reports that state rather than asking for a payment: the money
// was already sent, there is nothing here for the user to pay. "View" goes to the transaction
// history, where the deposit opens in the existing details modal.
export function UpcomingPayment({
  dateLabel,
  amountLabel,
}: {
  dateLabel: string;
  amountLabel: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-slate-800 dark:text-amber-400">
        <Clock3 className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Deposit pending</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {amountLabel} · submitted {dateLabel}
        </p>
      </div>
      <Link
        href="/transactions"
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
      >
        View
      </Link>
    </div>
  );
}
