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

// Transaction History. On mobile it's a pushed detail screen (back header, no bottom tab bar);
// on desktop it's a normal sidebar page with a titled header. The filter list is one shared
// client instance either way — only the header differs, by CSS breakpoint.
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
    <div className="mx-auto max-w-3xl px-5 pb-20 lg:px-8 lg:pt-4">
      {/* Mobile: back + centered title + search */}
      <header className="flex items-center gap-3 py-4 lg:hidden">
        <Link href="/dashboard" aria-label="Back" className={HEADER_BTN}>
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-center text-base font-bold text-slate-900 dark:text-white">
          Transaction History
        </h1>
        <ComingSoonButton ariaLabel="Search" message="Search is coming soon." className={HEADER_BTN}>
          <Search className="size-5" />
        </ComingSoonButton>
      </header>

      {/* Desktop: titled header */}
      <div className="hidden pt-2 pb-4 lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Transaction History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your full ledger across all wallets.
        </p>
      </div>

      <TransactionFilters transactions={transactions} />
    </div>
  );
}
