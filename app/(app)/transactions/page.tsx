import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { presentTransaction } from "@/lib/dashboard/transactions";
import { TransactionFilters } from "@/components/app/transaction-filters";

export const metadata: Metadata = { title: "Transaction History" };

const HISTORY_LIMIT = 100;

// Transaction History. Same inner-page shell as Deposit/Exchange/Voucher: a light card centered
// in the desktop content panel (and full-width on mobile), with a back-button header. The rows
// are fetched once; clicking one opens the details modal (no route change).
export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const transactions = rows.map((row) => presentTransaction(row, now));

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/dashboard"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Transaction history</h1>
            <p className="text-sm text-slate-500">Your full ledger across all wallets.</p>
          </div>
        </div>

        <TransactionFilters transactions={transactions} />
      </div>
    </div>
  );
}
