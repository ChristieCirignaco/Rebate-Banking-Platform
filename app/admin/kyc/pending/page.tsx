import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { KycSubmissionsView } from "@/components/admin/kyc/kyc-submissions-view";
import { getKycSubmissions } from "@/lib/admin/kyc";

export const metadata: Metadata = { title: "Awaiting KYC" };

export default async function KycPendingPage() {
  const initial = await getKycSubmissions({ status: "pending" });

  return (
    <AdminSection
      title="Awaiting KYC"
      description="Identity-verification requests waiting for your review."
    >
      <KycSubmissionsView initial={initial} mode="pending" />
    </AdminSection>
  );
}
