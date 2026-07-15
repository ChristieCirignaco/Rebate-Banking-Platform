import type { Metadata } from "next";
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
import type { DashboardView } from "@/components/app/dashboard-view";
import { DesktopHome } from "@/components/app/desktop-home";
import { MobileHome } from "@/components/app/mobile-home";

export const metadata: Metadata = { title: "Home" };

const PREVIEW_COUNT = 6;

// Home screen. The (app) layout already gated access; this reads the session (cached) for
// identity and the user's wallets + ledger + rebate/withdraw records, derives a single view
// model, and hands it to both the mobile and desktop compositions (rendered once each; CSS
// decides which is visible — no JS flash, and the queries run only once).
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

  const productCount = (status: string) =>
    productGroups.find((g) => g.status === status)?._count._all ?? 0;
  const withdrawByStatus = (status: string) => withdrawGroups.find((g) => g.status === status);
  const transferIn = transferGroups.find((g) => g.direction === "credit");
  const transferOut = transferGroups.find((g) => g.direction === "debit");

  const view: DashboardView = {
    name: session.user.name ?? "there",
    email: session.user.email ?? "",
    greeting: greetingForDate(now),
    image: session.user.image,
    balanceLabel: defaultWallet
      ? formatCurrency(toMajor(defaultWallet.balanceMinor), currency)
      : formatCurrency(0, "USD"),
    delta: defaultWallet
      ? computeBalanceDelta(deltaRows, defaultWallet.balanceMinor, currency, now)
      : null,
    stats: {
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
    },
    groups: groupByLabel(recentTxns.map((txn) => presentTransaction(txn, now))),
    upcoming: pendingDeposit
      ? {
          dateLabel: pendingDeposit.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }),
          amountLabel: formatCurrency(toMajor(pendingDeposit.amountMinor), pendingDeposit.currency),
        }
      : null,
  };

  return (
    <>
      <MobileHome view={view} />
      <DesktopHome view={view} />
    </>
  );
}
