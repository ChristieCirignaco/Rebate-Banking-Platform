import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import {
  computeBalanceDelta,
  greetingForDate,
  groupByLabel,
  presentTransaction,
} from "@/lib/dashboard/transactions";
import { BalanceHero } from "@/components/app/balance-hero";
import { DashboardHeader } from "@/components/app/dashboard-header";
import { QuickActions } from "@/components/app/quick-actions";
import { StatWidgets, type StatWidgetsData } from "@/components/app/stat-widgets";
import { TransactionsList } from "@/components/app/transactions-list";
import { UpcomingPayment } from "@/components/app/upcoming-payment";

export const metadata: Metadata = { title: "Home" };

const HERO_GRADIENT = "linear-gradient(165deg,#2748a0 0%,#1a2f66 46%,#0f1a38 100%)";
const PREVIEW_COUNT = 4;

// Home screen (mockup screen 1). The (app) layout already gated access; this reads the
// session (cached) for identity and the user's wallets + ledger + rebate/withdraw records
// for the live figures.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
  });
  const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0] ?? null;
  const currency = defaultWallet?.currency ?? "USD";

  const [recentTxns, pendingDeposit, deltaRows, productGroups, withdrawGroups, transferGroups] =
    await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: PREVIEW_COUNT,
      }),
      prisma.deposit.findFirst({
        where: { userId, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
      defaultWallet
        ? prisma.walletTransaction.findMany({
            where: { walletId: defaultWallet.id, createdAt: { gte: thirtyDaysAgo } },
            select: { direction: true, amountMinor: true, createdAt: true },
          })
        : Promise.resolve([]),
      prisma.product.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
      prisma.withdraw.groupBy({
        by: ["status"],
        where: { userId, currency },
        _count: { _all: true },
        _sum: { amountMinor: true },
      }),
      prisma.walletTransaction.groupBy({
        by: ["direction"],
        where: { userId, source: "transfer", currency },
        _count: { _all: true },
        _sum: { amountMinor: true },
      }),
    ]);

  const balanceLabel = defaultWallet
    ? formatCurrency(toMajor(defaultWallet.balanceMinor), currency)
    : formatCurrency(0, "USD");
  const delta = defaultWallet
    ? computeBalanceDelta(deltaRows, defaultWallet.balanceMinor, currency, now)
    : null;

  const groups = groupByLabel(recentTxns.map((txn) => presentTransaction(txn, now)));

  // --- Overview stat widgets ------------------------------------------------------------
  const productCount = (status: string) =>
    productGroups.find((g) => g.status === status)?._count._all ?? 0;
  const withdrawByStatus = (status: string) => withdrawGroups.find((g) => g.status === status);
  const transferByDir = (dir: string) => transferGroups.find((g) => g.direction === dir);
  const transferIn = transferByDir("credit");
  const transferOut = transferByDir("debit");

  const stats: StatWidgetsData = {
    products: {
      total: productGroups.reduce((sum, g) => sum + g._count._all, 0),
      approved: productCount("approved"),
      pending: productCount("pending"),
    },
    withdrawals: {
      amountLabel: formatCurrency(
        toMajor(withdrawByStatus("completed")?._sum.amountMinor ?? 0n),
        currency,
      ),
      pending: withdrawByStatus("pending")?._count._all ?? 0,
      total: withdrawGroups.reduce((sum, g) => sum + g._count._all, 0),
    },
    transfers: {
      amountLabel: formatCurrency(
        toMajor((transferIn?._sum.amountMinor ?? 0n) + (transferOut?._sum.amountMinor ?? 0n)),
        currency,
      ),
      count: (transferIn?._count._all ?? 0) + (transferOut?._count._all ?? 0),
      inCount: transferIn?._count._all ?? 0,
      outCount: transferOut?._count._all ?? 0,
    },
  };

  const upcoming = pendingDeposit
    ? {
        dateLabel: pendingDeposit.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }),
        amountLabel: formatCurrency(toMajor(pendingDeposit.amountMinor), pendingDeposit.currency),
      }
    : null;

  return (
    <>
      <section className="px-5 pt-6 pb-10 text-white" style={{ background: HERO_GRADIENT }}>
        <DashboardHeader
          greeting={greetingForDate(now)}
          name={session.user.name ?? "there"}
          image={session.user.image}
          unreadCount={0}
        />
        <BalanceHero balanceLabel={balanceLabel} delta={delta} />
        <QuickActions />
      </section>

      <section className="-mt-6 flex-1 rounded-t-[28px] bg-white px-5 pt-5 pb-28 dark:bg-slate-950">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Overview</h2>
        <StatWidgets {...stats} />

        {upcoming ? (
          <UpcomingPayment dateLabel={upcoming.dateLabel} amountLabel={upcoming.amountLabel} />
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Transactions</h2>
            <Link href="/transactions" className="text-sm font-medium text-blue-600 dark:text-blue-400">
              See More
            </Link>
          </div>

          {groups.length > 0 ? (
            <TransactionsList groups={groups} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              No transactions yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
