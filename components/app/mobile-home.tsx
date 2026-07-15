import Link from "next/link";

import type { DashboardView } from "@/components/app/dashboard-view";
import { BalanceHero } from "@/components/app/balance-hero";
import { DashboardHeader } from "@/components/app/dashboard-header";
import { QuickActions } from "@/components/app/quick-actions";
import { StatWidgets } from "@/components/app/stat-widgets";
import { TransactionsList } from "@/components/app/transactions-list";
import { UpcomingPayment } from "@/components/app/upcoming-payment";

const HERO_GRADIENT = "linear-gradient(165deg,#2748a0 0%,#1a2f66 46%,#0f1a38 100%)";

// The mobile Home composition (shown below lg): dark hero → white sheet, capped width so it
// centers nicely on tablets and is full-bleed on phones. Consumes the shared view model.
export function MobileHome({ view }: { view: DashboardView }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col bg-white lg:hidden dark:bg-slate-950">
      <section className="px-5 pt-6 pb-10 text-white" style={{ background: HERO_GRADIENT }}>
        <DashboardHeader
          greeting={view.greeting}
          name={view.name}
          image={view.image}
          unreadCount={0}
        />
        <div className="mt-6">
          <BalanceHero balanceLabel={view.balanceLabel} delta={view.delta} />
        </div>
        <QuickActions />
      </section>

      <section className="-mt-6 flex-1 rounded-t-[28px] bg-white px-5 pt-5 pb-28 dark:bg-slate-950">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Overview</h2>
        <StatWidgets {...view.stats} />

        {view.upcoming ? (
          <UpcomingPayment dateLabel={view.upcoming.dateLabel} amountLabel={view.upcoming.amountLabel} />
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Transactions</h2>
            <Link href="/transactions" className="text-sm font-medium text-blue-600 dark:text-blue-400">
              See More
            </Link>
          </div>

          {view.groups.length > 0 ? (
            <TransactionsList groups={view.groups} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              No transactions yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
