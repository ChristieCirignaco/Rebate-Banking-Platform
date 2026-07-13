import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Withdrawals" };

export default function AdminWithdrawalsPage() {
  return (
    <>
      <AdminPageHeader
        title="Withdrawals"
        description="Fulfill withdrawal requests and update their status."
      />
      <PlaceholderPanel>
        The withdrawal fulfillment queue lands in Phase 4.
      </PlaceholderPanel>
    </>
  );
}
