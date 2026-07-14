import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { KycSubmissionsView } from "@/components/admin/kyc/kyc-submissions-view";
import { getKycSubmissions } from "@/lib/admin/kyc";

export const metadata: Metadata = { title: "KYC List" };

export default async function KycListPage() {
  const initial = await getKycSubmissions({ status: "all" });

  return (
    <AdminSection
      title="KYC List"
      description="Every identity-verification submission, processed and pending."
    >
      <KycSubmissionsView initial={initial} mode="all" />
    </AdminSection>
  );
}
