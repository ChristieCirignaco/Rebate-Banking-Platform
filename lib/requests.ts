import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";

// User-facing Request Money reads: the caller's wallets (to choose which to credit) and their
// recent requests with status. Presentation is folded here so the client form stays clean.

export type RequestStatus = "pending" | "approved" | "rejected";

export type RequestWalletView = {
  id: string;
  currency: string;
  balanceLabel: string;
  label: string; // "USD Wallet"
};

export type UserRequestRow = {
  id: string;
  txnId: string;
  amountLabel: string;
  reason: string | null;
  status: RequestStatus;
  remarks: string | null;
  createdAtLabel: string;
};

export type RequestPageData = {
  wallets: RequestWalletView[];
  requests: UserRequestRow[];
};

export async function getRequestPageData(userId: string): Promise<RequestPageData> {
  const [wallets, requests] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
    }),
    prisma.moneyRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    wallets: wallets.map((w) => ({
      id: w.id,
      currency: w.currency,
      balanceLabel: formatCurrency(toMajor(w.balanceMinor), w.currency),
      label: `${w.currency} Wallet`,
    })),
    requests: requests.map((r) => ({
      id: r.id,
      txnId: r.txnId,
      amountLabel: formatCurrency(toMajor(r.amountMinor), r.currency),
      reason: r.reason,
      status: r.status as RequestStatus,
      remarks: r.remarks,
      createdAtLabel: formatDateTime(r.createdAt.toISOString()),
    })),
  };
}
