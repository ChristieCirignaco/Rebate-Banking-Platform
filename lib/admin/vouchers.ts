import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { effectiveVoucherStatus } from "@/lib/voucher-code";
import type { AdminVoucherRow, AdminVoucherStatus } from "@/components/admin/vouchers/types";

// Admin read layer for Vouchers — all vouchers across users. Read-only (vouchers settle via the
// user's generate/redeem actions); the money legs also appear in /admin/transaction.

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
    status: effectiveVoucherStatus(v.status, v.expiresAt) as AdminVoucherStatus,
    redeemedByName: v.redeemedByName,
    redeemedOnLabel: v.redeemedAt ? formatDateTime(v.redeemedAt.toISOString()) : null,
    createdOnLabel: formatDateTime(v.createdAt.toISOString()),
  }));
}
