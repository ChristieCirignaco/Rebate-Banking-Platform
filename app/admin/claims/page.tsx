import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Claims" };

export default function AdminClaimsPage() {
  return (
    <AdminSection
      title="Claims"
      description="Review submitted rebate claims and approve or reject them."
    >
      <PlaceholderPanel>
        The claims review queue lands in Phase 3.
      </PlaceholderPanel>
    </AdminSection>
  );
}
