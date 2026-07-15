import { Megaphone } from "lucide-react";

import { ComingSoonButton } from "@/components/app/coming-soon-button";

// The "Upcoming Payment" strip — the user's latest still-pending deposit/withdrawal. The page
// only renders this when one exists. "Pay Now" is stubbed for now.
export function UpcomingPayment({
  dateLabel,
  amountLabel,
}: {
  dateLabel: string;
  amountLabel: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
        <Megaphone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Payment</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {dateLabel} · {amountLabel}
        </p>
      </div>
      <ComingSoonButton
        message="Payments are coming soon."
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Pay Now
      </ComingSoonButton>
    </div>
  );
}
