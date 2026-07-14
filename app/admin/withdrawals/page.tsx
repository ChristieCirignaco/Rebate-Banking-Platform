import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { WithdrawsTabs } from "@/components/admin/withdrawals/withdraws-tabs";
import {
  getCurrencyOptions,
  getGatewayOptions,
  getManualRequests,
  getWithdrawHistory,
  getWithdrawMethods,
  getWithdrawSchedule,
} from "@/lib/admin/withdrawals";

export const metadata: Metadata = { title: "Withdrawals" };

export default async function AdminWithdrawalsPage() {
  const [requests, autoMethods, manualMethods, schedule, history, currencies, gateways] =
    await Promise.all([
      getManualRequests(),
      getWithdrawMethods("auto"),
      getWithdrawMethods("manual"),
      getWithdrawSchedule(),
      getWithdrawHistory(),
      getCurrencyOptions(),
      getGatewayOptions(),
    ]);

  return (
    <AdminSection
      title="Withdrawals"
      description="Review manual requests, configure methods, set the schedule, and browse history."
    >
      <WithdrawsTabs
        requests={requests}
        autoMethods={autoMethods}
        manualMethods={manualMethods}
        schedule={schedule}
        history={history}
        currencies={currencies}
        gateways={gateways}
      />
    </AdminSection>
  );
}
