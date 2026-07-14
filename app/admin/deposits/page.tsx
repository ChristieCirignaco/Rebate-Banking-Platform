import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { DepositsTabs } from "@/components/admin/deposits/deposits-tabs";
import {
  getCurrencyOptions,
  getDepositHistory,
  getDepositMethods,
  getGatewayOptions,
  getManualRequests,
} from "@/lib/admin/deposits";

export const metadata: Metadata = { title: "Deposits" };

export default async function AdminDepositsPage() {
  const [requests, autoMethods, manualMethods, history, currencies, gateways] =
    await Promise.all([
      getManualRequests(),
      getDepositMethods("auto"),
      getDepositMethods("manual"),
      getDepositHistory(),
      getCurrencyOptions(),
      getGatewayOptions(),
    ]);

  return (
    <AdminSection
      title="Deposits"
      description="Review manual requests, configure deposit methods, and browse history."
    >
      <DepositsTabs
        requests={requests}
        autoMethods={autoMethods}
        manualMethods={manualMethods}
        history={history}
        currencies={currencies}
        gateways={gateways}
      />
    </AdminSection>
  );
}
