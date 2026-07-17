import type { BalanceDelta, TransactionGroup } from "@/lib/dashboard/transactions";
import type { StatWidgetsData } from "@/components/app/stat-widgets";

// The fully-computed view model for the Home screen. The page fetches + derives this once
// (server-side) and hands the same object to both the mobile and desktop compositions, so
// there is a single source of truth and the queries run only once.
export type DashboardView = {
  name: string;
  email: string;
  greeting: string;
  image: string | null | undefined;
  balanceLabel: string;
  delta: BalanceDelta | null;
  stats: StatWidgetsData;
  groups: TransactionGroup[];
  upcoming: { dateLabel: string; amountLabel: string } | null;
};
