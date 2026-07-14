import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { TransactionsView } from "@/components/admin/transactions/transactions-view";
import { getTransactions } from "@/lib/admin/transactions";

export const metadata: Metadata = { title: "Transactions" };

export default async function AdminTransactionsPage() {
  const initial = await getTransactions();

  return (
    <AdminSection
      title="Transactions"
      description="Every wallet transaction across the platform."
    >
      <TransactionsView initial={initial} />
    </AdminSection>
  );
}
