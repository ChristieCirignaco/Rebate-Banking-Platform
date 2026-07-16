import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { VouchersView } from "@/components/admin/vouchers/vouchers-view";
import { getAdminVouchers } from "@/lib/admin/vouchers";

export const metadata: Metadata = { title: "Vouchers" };

export default async function AdminVouchersPage() {
  const vouchers = await getAdminVouchers();

  return (
    <AdminSection
      title="Vouchers"
      description="All generated vouchers and their redemption status. Voucher fees are set per currency in Currencies."
    >
      <VouchersView vouchers={vouchers} />
    </AdminSection>
  );
}
