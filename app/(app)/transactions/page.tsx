import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { presentTransaction } from "@/lib/dashboard/transactions";
import { ComingSoonButton } from "@/components/app/coming-soon-button";
import { TransactionFilters } from "@/components/app/transaction-filters";

export const metadata: Metadata = { title: "Transaction History" };

const HEADER_BTN =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

const HISTORY_LIMIT = 100;

// Transaction History. Mobile: a pushed detail screen (back header, no bottom tab bar) on the
// light flow. Desktop: a dark-scoped card inside the dark content panel. The rows are fetched
// once and handed to both compositions.
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
    <>
      {/* Mobile: back + centered title + search, on the light flow */}
      <div className="mx-auto max-w-3xl px-5 pb-20 lg:hidden">
        <header className="flex items-center gap-3 py-4">
          <Link href="/dashboard" aria-label="Back" className={HEADER_BTN}>
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold text-slate-900 dark:text-white">
            Transaction History
          </h1>
          <ComingSoonButton
            ariaLabel="Search"
            message="Search is coming soon."
            className={HEADER_BTN}
          >
            <Search className="size-5" />
          </ComingSoonButton>
        </header>
        <TransactionFilters transactions={transactions} />
      </div>

      {/* Desktop: dark-scoped card in the dark content panel */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Transaction History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your full ledger across all wallets.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <TransactionFilters transactions={transactions} />
          </div>
        </div>
      </div>
    </>
  );
}
