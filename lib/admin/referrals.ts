import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import type { AdminReferralEarning, AdminReferralStatus } from "@/components/admin/referrals/types";

// Admin read layer for referral earnings — all of them, across users.
export async function getAdminReferralEarnings(): Promise<AdminReferralEarning[]> {
  const rows = await prisma.referralEarning.findMany({
    include: {
      referrer: { select: { name: true, email: true } },
      referredUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((e) => ({
    id: e.id,
    referrerName: e.referrer.name,
    referrerEmail: e.referrer.email,
    referredName: e.referredUser.name,
    amountLabel: formatCurrency(toMajor(e.amountMinor), e.currency),
    trigger: e.trigger,
    status: e.status as AdminReferralStatus,
    reviewedByName: e.reviewedByName,
    createdAtLabel: formatDateTime(e.createdAt.toISOString()),
    paidAtLabel: e.paidAt ? formatDateTime(e.paidAt.toISOString()) : null,
  }));
}
