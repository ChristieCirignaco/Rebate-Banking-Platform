import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "KYC" };

export default function AdminKycPage() {
  return (
    <AdminSection
      title="KYC"
      description="Review identity verification submissions."
    >
      <PlaceholderPanel>
        The KYC review queue lands in Phase 5.
      </PlaceholderPanel>
    </AdminSection>
  );
}
