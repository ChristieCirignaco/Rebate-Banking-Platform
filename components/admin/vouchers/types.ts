// Prisma-free type for the admin Voucher list UI (safe to import into client components).
export type AdminVoucherStatus = "pending" | "redeemed" | "expired" | "canceled";

export interface AdminVoucherRow {
  id: string;
  code: string;
  creatorName: string;
  creatorEmail: string;
  amountLabel: string;
  feeLabel: string;
  currency: string;
  status: AdminVoucherStatus;
  redeemedByName: string | null;
  redeemedOnLabel: string | null;
  createdOnLabel: string;
}
