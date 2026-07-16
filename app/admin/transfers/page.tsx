import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import {
  getAdminTransfers,
  TRANSFER_STATUSES,
  TRANSFER_TYPES,
  type TransferStatus,
  type TransferType,
} from "@/lib/admin/transfers";
import { TransfersView } from "@/components/admin/transfers/transfers-view";

export const metadata: Metadata = { title: "Transfers" };

export default async function AdminTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const type: TransferType | "all" = TRANSFER_TYPES.includes(sp.type as TransferType)
    ? (sp.type as TransferType)
    : "all";
  const status: TransferStatus | "all" = TRANSFER_STATUSES.includes(sp.status as TransferStatus)
    ? (sp.status as TransferStatus)
    : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const data = await getAdminTransfers({ type, status, page });

  return (
    <AdminSection
      title="Transfers"
      description="Review and process user transfers — internal (user-to-user), domestic, and wire."
    >
      <TransfersView data={data} activeType={type} activeStatus={status} />
    </AdminSection>
  );
}
