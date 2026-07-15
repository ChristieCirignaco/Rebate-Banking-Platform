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

// Transaction History (mockup screen 2). A pushed detail screen — its own back header, and
// the (app) shell hides the bottom tab bar here. Rows are presented on the server and handed
// to the client filter component.
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
    <div className="px-5 pb-16">
      <header className="flex items-center gap-3 py-4">
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

      <TransactionFilters transactions={transactions} />
    </div>
  );
}
