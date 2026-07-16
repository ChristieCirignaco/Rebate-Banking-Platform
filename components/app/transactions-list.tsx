import type { TransactionGroup } from "@/lib/dashboard/transactions";
import { TransactionRow } from "@/components/app/transaction-row";

// Renders day-grouped ledger rows: a small sticky-feeling date label per group, then the
// rows with hairline dividers. Pure presentational — the caller decides which rows to pass
// (Home passes a short preview; History passes the filtered full list).
export function TransactionsList({
  groups,
  onSelect,
}: {
  groups: TransactionGroup[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col">
          <p className="pt-3 pb-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            {group.label}
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {group.items.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
