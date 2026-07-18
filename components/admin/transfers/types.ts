// Types for the Transfers admin area (/admin/transfers). These live outside lib/admin/transfers
// because the view is a client component: that module imports lib/db, so pulling a runtime value
// (the constants below) from it drags Prisma + lib/env into the client graph, where process.env
// has no server vars and the env schema throws. Types alone are erased and would be safe; the
// constants are not — so both sides import them from here.

export type TransferType = "internal" | "domestic" | "wire";
export type TransferStatus = "pending" | "completed" | "rejected" | "canceled" | "failed";

export const TRANSFER_TYPES: TransferType[] = ["internal", "domestic", "wire"];
// Only the statuses a transfer can actually reach — created "pending", then "completed" (approve)
// or "rejected" (reject). "canceled"/"failed" are never written to transfers, so they're kept on
// the type (for defensive display) but excluded from the filter so it can't offer empty results.
export const TRANSFER_STATUSES: TransferStatus[] = ["pending", "completed", "rejected"];

export type AdminTransferView = {
  id: string;
  txnId: string;
  type: TransferType;
  status: TransferStatus;
  currency: string;
  amountLabel: string;
  feeLabel: string;
  senderName: string;
  senderEmail: string;
  recipientLabel: string; // internal: recipient user; external: account holder
  recipientSub: string | null; // internal: email; external: bank · account
  bankDetails: { label: string; value: string }[]; // domestic/wire
  codesVerified: boolean;
  description: string | null;
  remarks: string | null;
  dateLabel: string;
  reviewedByName: string | null;
  reviewedLabel: string | null;
};
