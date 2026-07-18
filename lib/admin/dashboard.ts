import { ArrowLeftRight, Coins, Users, Wallet } from "lucide-react";

import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  LatestUserRow,
  StatWidget,
  TimeSeriesPoint,
  TransactionRow,
  TransactionType,
  WalletSummaryItem,
} from "@/components/admin/overview/types";

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  NGN: "Nigerian Naira",
  USDT: "Tether",
};

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

// Bucket values by UTC day over the last `days` days, filling gaps with 0.
function bucketByDay(
  entries: { date: Date; value: number }[],
  days: number,
): TimeSeriesPoint[] {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.date < since) continue;
    const key = entry.date.toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + entry.value);
  }

  const series: TimeSeriesPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, value: totals.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

export async function getStatWidgets(): Promise<StatWidget[]> {
  const [balance, totalUsers, txnCount, fees] = await Promise.all([
    prisma.wallet.aggregate({ _sum: { balanceMinor: true } }),
    prisma.user.count(),
    prisma.walletTransaction.count(),
    prisma.walletTransaction.aggregate({
      _sum: { amountMinor: true },
      where: { source: "fee" },
    }),
  ]);

  return [
    {
      label: "Total Balance",
      value: toMajor(balance._sum.balanceMinor ?? 0n),
      icon: Wallet,
      tint: "emerald",
      href: "/admin/withdrawals",
      isCurrency: true,
    },
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      tint: "blue",
      href: "/admin/users",
    },
    {
      label: "Transactions",
      value: txnCount,
      icon: ArrowLeftRight,
      tint: "violet",
      href: "/admin/withdrawals",
    },
    {
      label: "Fees Earned",
      value: toMajor(fees._sum.amountMinor ?? 0n),
      icon: Coins,
      tint: "amber",
      href: "/admin/payment-gateways",
      isCurrency: true,
    },
  ];
}

export async function getTransactionSeries(
  days = 90,
): Promise<TimeSeriesPoint[]> {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await prisma.walletTransaction.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  return bucketByDay(
    rows.map((row) => ({ date: row.createdAt, value: 1 })),
    days,
  );
}

export async function getDailyFees(days = 30): Promise<TimeSeriesPoint[]> {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await prisma.walletTransaction.findMany({
    where: { source: "fee", createdAt: { gte: since } },
    select: { createdAt: true, amountMinor: true },
  });
  return bucketByDay(
    rows.map((row) => ({
      date: row.createdAt,
      value: toMajor(row.amountMinor),
    })),
    days,
  );
}

export async function getDailyWalletGrowth(
  days = 30,
): Promise<TimeSeriesPoint[]> {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await prisma.wallet.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  return bucketByDay(
    rows.map((row) => ({ date: row.createdAt, value: 1 })),
    days,
  );
}

export async function getWalletSummary(): Promise<WalletSummaryItem[]> {
  const grouped = await prisma.wallet.groupBy({
    by: ["currency"],
    _sum: { balanceMinor: true },
    _count: { _all: true },
    orderBy: { currency: "asc" },
  });
  return grouped.map((group) => ({
    currency: group.currency,
    name: CURRENCY_NAMES[group.currency] ?? group.currency,
    walletCount: group._count._all,
    balance: toMajor(group._sum.balanceMinor ?? 0n),
  }));
}

export async function getLatestTransactions(
  limit = 6,
): Promise<TransactionRow[]> {
  const rows = await prisma.walletTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id.slice(0, 8).toUpperCase(),
    user: row.user.name,
    amount: (row.direction === "credit" ? 1 : -1) * toMajor(row.amountMinor),
    currency: row.currency,
    type: row.source as TransactionType,
    status: (row.status === "failed"
      ? "failed"
      : row.status === "pending"
        ? "pending"
        : "completed") as TransactionRow["status"],
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getLatestUsers(limit = 5): Promise<LatestUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
    },
  });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.emailVerified,
    avatarUrl: user.image ?? undefined,
    joinedAt: user.createdAt.toISOString(),
  }));
}
