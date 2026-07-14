import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { CurrencyListActions } from "@/components/admin/currencies/currency-list-actions";
import { CurrencyTable } from "@/components/admin/currencies/currency-table";
import { Card } from "@/components/ui/card";
import { getCurrencies } from "@/lib/admin/currencies";

export const metadata: Metadata = { title: "Currency Management" };

export default async function AdminCurrenciesPage() {
  const { rows, defaultCode } = await getCurrencies();

  return (
    <AdminSection
      title="Currency Management"
      description="Manage every currency in the system and its wallet configuration."
      actions={<CurrencyListActions defaultCode={defaultCode} />}
    >
      <Card className="overflow-hidden py-0">
        <CurrencyTable currencies={rows} defaultCode={defaultCode} />
      </Card>
    </AdminSection>
  );
}
