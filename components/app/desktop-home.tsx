import Link from "next/link";

import type { DashboardView } from "@/components/app/dashboard-view";
import { BalanceCard } from "@/components/app/balance-card";
import { StatWidgets } from "@/components/app/stat-widgets";
import { TransactionsList } from "@/components/app/transactions-list";
import { UpcomingPayment } from "@/components/app/upcoming-payment";

// The desktop Home composition (shown at lg+): a two-column top row — balance card (+ upcoming)
// on the left, the Overview stat cluster on the right — then a full-width transactions panel.
// Reuses the exact same pieces as mobile; only the arrangement differs.
export function DesktopHome({ view }: { view: DashboardView }) {
  return (
    <div className="hidden px-8 py-6 lg:block">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <BalanceCard balanceLabel={view.balanceLabel} delta={view.delta} />
            {view.upcoming ? (
              <UpcomingPayment
                dateLabel={view.upcoming.dateLabel}
                amountLabel={view.upcoming.amountLabel}
              />
            ) : null}
          </div>
          <StatWidgets {...view.stats} />
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h2>
            <Link
              href="/transactions"
              className="text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              View all
            </Link>
          </div>

          {view.groups.length > 0 ? (
            <TransactionsList groups={view.groups} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              No transactions yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
