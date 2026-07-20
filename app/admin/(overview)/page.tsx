import type { Metadata } from "next";

import { BarSeriesChart } from "@/components/admin/overview/bar-series-chart";
import { LatestTransactionsTable } from "@/components/admin/overview/latest-transactions-table";
import { LatestUsersTable } from "@/components/admin/overview/latest-users-table";
import { StatCards } from "@/components/admin/overview/stat-card";
import { SummaryChart } from "@/components/admin/overview/summary-chart";
import { WalletSummary } from "@/components/admin/overview/wallet-summary";
import {
  getDailyFees,
  getDailyWalletGrowth,
  getLatestTransactions,
  getLatestUsers,
  getStatWidgets,
  getTransactionSeries,
  getWalletSummary,
} from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

// Overview body — all widgets read live data from the DB (design spec §16).
export default async function AdminDashboardPage() {
  const [
    statWidgets,
    transactionSummary,
    walletSummary,
    dailyFees,
    dailyWalletGrowth,
    latestTransactions,
    latestUsers,
  ] = await Promise.all([
    getStatWidgets(),
    getTransactionSeries(90),
    getWalletSummary(),
    getDailyFees(90),
    getDailyWalletGrowth(90),
    getLatestTransactions(6),
    getLatestUsers(5),
  ]);

  return (
    <>
      <StatCards widgets={statWidgets} />

      <div className="px-4 lg:px-6">
        <SummaryChart data={transactionSummary} />
      </div>

      <div className="px-4 lg:px-6">
        <WalletSummary wallets={walletSummary} />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <BarSeriesChart
          title="Daily Fee Earnings"
          data={dailyFees}
          color="var(--chart-2)"
          seriesLabel="Fees"
        />
        <BarSeriesChart
          title="Daily Wallet Growth"
          data={dailyWalletGrowth}
          color="var(--chart-3)"
          seriesLabel="New wallets"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <LatestTransactionsTable transactions={latestTransactions} />
        <LatestUsersTable users={latestUsers} />
      </div>
    </>
  );
}
