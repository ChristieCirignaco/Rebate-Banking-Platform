import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "KYC" };

export default function AdminKycPage() {
  return (
    <>
      <AdminPageHeader
        title="KYC"
        description="Review identity verification submissions."
      />
      <PlaceholderPanel>
        The KYC review queue lands in Phase 5.
      </PlaceholderPanel>
    </>
  );
}
