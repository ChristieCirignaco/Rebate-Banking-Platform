import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Claims" };

export default function AdminClaimsPage() {
  return (
    <>
      <AdminPageHeader
        title="Claims"
        description="Review submitted rebate claims and approve or reject them."
      />
      <PlaceholderPanel>
        The claims review queue lands in Phase 3.
      </PlaceholderPanel>
    </>
  );
}
