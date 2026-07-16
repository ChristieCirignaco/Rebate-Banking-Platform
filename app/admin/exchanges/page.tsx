import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { ExchangesView } from "@/components/admin/exchanges/exchanges-view";
import { getAdminExchanges } from "@/lib/admin/exchanges";

export const metadata: Metadata = { title: "Exchanges" };

export default async function AdminExchangesPage() {
  const exchanges = await getAdminExchanges();

  return (
    <AdminSection
      title="Exchanges"
      description="In-wallet currency conversions. Rates are set in Currencies; exchanges settle instantly."
    >
      <ExchangesView exchanges={exchanges} />
    </AdminSection>
  );
}
