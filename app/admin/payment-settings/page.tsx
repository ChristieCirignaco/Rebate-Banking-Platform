import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Payment settings" };

export default function AdminPaymentSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Payment settings"
        description="Configure payment providers and their encrypted keys."
      />
      <PlaceholderPanel>
        Provider configuration lands in Phase 6.
      </PlaceholderPanel>
    </>
  );
}
