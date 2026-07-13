import { ArrowLeftRight, Coins, Users, Wallet } from "lucide-react";

import type {
  LatestUserRow,
  StatWidget,
  TimeSeriesPoint,
  TransactionRow,
  WalletSummaryItem,
} from "./types";

// -----------------------------------------------------------------------------
// Mock data for the admin overview. This is the ONLY place with sample values —
// replace these exports with real API/DB queries to wire the dashboard up.
// -----------------------------------------------------------------------------

// Deterministic series (sine + gentle uptrend) so charts look realistic and stable.
function series(days: number, shape: (i: number) => number): TimeSeriesPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (days - 1 - i));
    points.push({
      date: date.toISOString().slice(0, 10),
      value: Math.max(0, Math.round(shape(i))),
    });
  }
  return points;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export const statWidgets: StatWidget[] = [
  {
    label: "Total Balance",
    value: 128450.75,
    icon: Wallet,
    tint: "emerald",
    href: "/admin/wallet",
    isCurrency: true,
  },
  {
    label: "Total Users",
    value: 1284,
    icon: Users,
    tint: "blue",
    href: "/admin/users",
  },
  {
    label: "Transactions",
    value: 5821,
    icon: ArrowLeftRight,
    tint: "violet",
    href: "/admin/withdrawals",
  },
  {
    label: "Fees Earned",
    value: 3204.5,
    icon: Coins,
    tint: "amber",
    href: "/admin/payment-settings",
    isCurrency: true,
  },
];

export const transactionSummary: TimeSeriesPoint[] = series(
  90,
  (i) => 800 + 380 * Math.sin(i / 7) + i * 4,
);

export const walletSummary: WalletSummaryItem[] = [
  { currency: "USD", name: "US Dollar", walletCount: 842, balance: 74210.5 },
  { currency: "EUR", name: "Euro", walletCount: 318, balance: 28940 },
  {
    currency: "NGN",
    name: "Nigerian Naira",
    walletCount: 526,
    balance: 18650000,
  },
  {
    currency: "GBP",
    name: "British Pound",
    walletCount: 144,
    balance: 12030.25,
  },
];

export const dailyFees: TimeSeriesPoint[] = series(
  30,
  (i) => 60 + 28 * Math.sin(i / 4) + i,
);

export const dailyWalletGrowth: TimeSeriesPoint[] = series(
  30,
  (i) => 8 + 5 * Math.sin(i / 5) + i / 3,
);

export const latestTransactions: TransactionRow[] = [
  {
    id: "TXN-9F2A7C",
    user: "Amara Okafor",
    amount: 250,
    currency: "USD",
    type: "deposit",
    status: "completed",
    createdAt: hoursAgo(0.3),
  },
  {
    id: "TXN-7C1B04",
    user: "Liam Brown",
    amount: -120.5,
    currency: "USD",
    type: "withdrawal",
    status: "pending",
    createdAt: hoursAgo(1.4),
  },
  {
    id: "TXN-4E88D1",
    user: "Sofia Rossi",
    amount: 42.75,
    currency: "EUR",
    type: "rebate",
    status: "completed",
    createdAt: hoursAgo(3.1),
  },
  {
    id: "TXN-1A55F9",
    user: "Chen Wei",
    amount: -3.2,
    currency: "USD",
    type: "fee",
    status: "completed",
    createdAt: hoursAgo(5.5),
  },
  {
    id: "TXN-B20C6E",
    user: "Noah Smith",
    amount: -400,
    currency: "GBP",
    type: "withdrawal",
    status: "failed",
    createdAt: hoursAgo(9),
  },
  {
    id: "TXN-D71E3A",
    user: "Fatima Zahra",
    amount: 980,
    currency: "USD",
    type: "deposit",
    status: "completed",
    createdAt: hoursAgo(22),
  },
];

export const latestUsers: LatestUserRow[] = [
  {
    id: "u_01",
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
    verified: true,
    joinedAt: hoursAgo(2),
  },
  {
    id: "u_02",
    name: "Liam Brown",
    email: "liam.brown@example.com",
    verified: true,
    joinedAt: hoursAgo(6),
  },
  {
    id: "u_03",
    name: "Sofia Rossi",
    email: "sofia.rossi@example.com",
    verified: false,
    joinedAt: hoursAgo(20),
  },
  {
    id: "u_04",
    name: "Chen Wei",
    email: "chen.wei@example.com",
    verified: true,
    joinedAt: hoursAgo(28),
  },
  {
    id: "u_05",
    name: "Noah Smith",
    email: "noah.smith@example.com",
    verified: false,
    joinedAt: hoursAgo(52),
  },
];
