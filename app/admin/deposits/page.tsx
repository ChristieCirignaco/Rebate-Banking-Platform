import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Deposits" };

export default function AdminDepositsPage() {
  return (
    <AdminSection
      title="Deposits"
      description="Inspect deposit history (gated behind the deposits feature flag)."
    >
      <PlaceholderPanel>The deposits view lands in Phase 6.</PlaceholderPanel>
    </AdminSection>
  );
}
