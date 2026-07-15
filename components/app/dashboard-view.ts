import type { BalanceDelta, TransactionGroup } from "@/lib/dashboard/transactions";
import type { StatWidgetsData } from "@/components/app/stat-widgets";

// The fully-computed view model for the Home screen. The page fetches + derives this once
// (server-side) and hands the same object to both the mobile and desktop compositions, so
// there is a single source of truth and the queries run only once.
export type DashboardView = {
  name: string;
  greeting: string;
  image: string | null | undefined;
  balanceLabel: string;
  delta: BalanceDelta | null;
  stats: StatWidgetsData;
  groups: TransactionGroup[];
  upcoming: { dateLabel: string; amountLabel: string } | null;
};

// The nav destinations shared by the desktop sidebar and the mobile bottom bar, so both stay
// in sync. Icons are attached where each is rendered (keeps this a plain data module).
export const APP_NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/statistic", label: "Statistic" },
  { href: "/wallet", label: "Wallet" },
  { href: "/transactions", label: "Transactions" },
  { href: "/settings", label: "Settings" },
] as const;
