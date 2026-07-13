import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Withdrawals" };

export default function AdminWithdrawalsPage() {
  return (
    <AdminSection
      title="Withdrawals"
      description="Fulfill withdrawal requests and update their status."
    >
      <PlaceholderPanel>
        The withdrawal fulfillment queue lands in Phase 4.
      </PlaceholderPanel>
    </AdminSection>
  );
}
