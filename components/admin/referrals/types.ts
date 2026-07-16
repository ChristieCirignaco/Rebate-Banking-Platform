// Prisma-free types for the admin Referrals UI (safe to import into client components).
export type AdminReferralStatus = "pending" | "paid" | "rejected";

export interface AdminReferralEarning {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  amountLabel: string;
  trigger: string; // "signup" | "first_deposit"
  status: AdminReferralStatus;
  reviewedByName: string | null;
  createdAtLabel: string;
  paidAtLabel: string | null;
}
