"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  groupByLabel,
  type TransactionView,
  type TxnFilter,
} from "@/lib/dashboard/transactions";
import { TransactionsWithDetail } from "@/components/app/transactions-with-detail";

const CHIPS: { key: TxnFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
  { key: "transfer", label: "Transfer" },
  { key: "exchange", label: "Exchange" },
  { key: "voucher", label: "Voucher" },
  { key: "request", label: "Request" },
  { key: "product", label: "Product" },
];

// The filter chips + filtered ledger list for the Transaction History screen. Rows arrive
// already presented (server-side), so filtering is a synchronous array filter and grouping
// is a pure label walk — no date math on the client, no hydration drift.
export function TransactionFilters({ transactions }: { transactions: TransactionView[] }) {
  const [active, setActive] = useState<TxnFilter>("all");

  const filtered =
    active === "all" ? transactions : transactions.filter((t) => t.filters.includes(active));
  const groups = groupByLabel(filtered);
  const activeLabel = CHIPS.find((c) => c.key === active)?.label ?? "";

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActive(chip.key)}
            aria-pressed={active === chip.key}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active === chip.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <TransactionsWithDetail groups={groups} />
      ) : (
        <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
          {active === "all"
            ? "No transactions yet."
            : `No ${activeLabel.toLowerCase()} transactions.`}
        </p>
      )}
    </div>
  );
}
