import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Deposits" };

export default function AdminDepositsPage() {
  return (
    <>
      <AdminPageHeader
        title="Deposits"
        description="Inspect deposit history (gated behind the deposits feature flag)."
      />
      <PlaceholderPanel>The deposits view lands in Phase 6.</PlaceholderPanel>
    </>
  );
}
