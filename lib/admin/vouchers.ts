import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import type { AdminVoucherRow, AdminVoucherStatus } from "@/components/admin/vouchers/types";

// Admin read layer for Vouchers — all vouchers across users. Read-only (vouchers settle via the
// user's generate/redeem actions); the money legs also appear in /admin/transaction.
function effectiveStatus(status: string, expiresAt: Date | null): AdminVoucherStatus {
  if (status === "pending" && expiresAt && expiresAt.getTime() < Date.now()) return "expired";
  return status as AdminVoucherStatus;
}

export async function getAdminVouchers(): Promise<AdminVoucherRow[]> {
  const rows = await prisma.voucher.findMany({
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((v) => ({
    id: v.id,
    code: v.code,
    creatorName: v.creator.name,
    creatorEmail: v.creator.email,
    amountLabel: formatCurrency(toMajor(v.amountMinor), v.currency),
    feeLabel: formatCurrency(toMajor(v.feeMinor), v.currency),
    currency: v.currency,
    status: effectiveStatus(v.status, v.expiresAt),
    redeemedByName: v.redeemedByName,
    redeemedOnLabel: v.redeemedAt ? formatDateTime(v.redeemedAt.toISOString()) : null,
    createdOnLabel: formatDateTime(v.createdAt.toISOString()),
  }));
}
