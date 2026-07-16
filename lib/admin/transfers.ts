import { prisma } from "@/lib/db";
import { formatMinor } from "@/lib/money/money";

// Admin reads for the transfers review queue + history. Presentation is folded here so the
// page/view stay serialization-clean (no BigInt over the RSC boundary).

export type TransferType = "internal" | "domestic" | "wire";
export type TransferStatus = "pending" | "completed" | "rejected" | "canceled" | "failed";

export const TRANSFER_TYPES: TransferType[] = ["internal", "domestic", "wire"];
export const TRANSFER_STATUSES: TransferStatus[] = [
  "pending",
  "completed",
  "rejected",
  "canceled",
  "failed",
];

const PAGE_SIZE = 15;

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

const BANK_FIELD_LABELS: Record<string, string> = {
  bankName: "Bank",
  accountNumber: "Account number",
  accountName: "Account name",
  routingNumber: "Routing number",
  swift: "SWIFT / BIC",
  iban: "IBAN",
  country: "Country",
  reference: "Reference",
};

function toType(value: string): TransferType {
  return value === "domestic" || value === "wire" ? value : "internal";
}

function toStatus(value: string): TransferStatus {
  return (TRANSFER_STATUSES as string[]).includes(value) ? (value as TransferStatus) : "pending";
}

function dateFmt(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

type TransferRow = {
  id: string;
  txnId: string;
  type: string;
  status: string;
  currency: string;
  amountMinor: bigint;
  feeMinor: bigint;
  recipientName: string | null;
  recipientDetails: unknown;
  codesVerified: boolean;
  description: string | null;
  remarks: string | null;
  createdAt: Date;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  user: { name: string; email: string };
  recipientUser: { name: string; email: string } | null;
};

function present(row: TransferRow): AdminTransferView {
  const type = toType(row.type);
  const details =
    row.recipientDetails && typeof row.recipientDetails === "object"
      ? (row.recipientDetails as Record<string, unknown>)
      : {};
  const bankDetails = Object.entries(BANK_FIELD_LABELS)
    .filter(([key]) => typeof details[key] === "string" && (details[key] as string).trim())
    .map(([key, label]) => ({ label, value: (details[key] as string).trim() }));

  let recipientLabel: string;
  let recipientSub: string | null;
  if (type === "internal") {
    recipientLabel = row.recipientUser?.name ?? row.recipientName ?? "Unknown user";
    recipientSub = row.recipientUser?.email ?? null;
  } else {
    recipientLabel = row.recipientName ?? "External account";
    const bank = typeof details.bankName === "string" ? details.bankName : null;
    const acct = typeof details.accountNumber === "string" ? details.accountNumber : null;
    recipientSub = [bank, acct].filter(Boolean).join(" · ") || null;
  }

  return {
    id: row.id,
    txnId: row.txnId,
    type,
    status: toStatus(row.status),
    currency: row.currency,
    amountLabel: formatMinor(row.amountMinor, row.currency),
    feeLabel: formatMinor(row.feeMinor, row.currency),
    senderName: row.user.name,
    senderEmail: row.user.email,
    recipientLabel,
    recipientSub,
    bankDetails,
    codesVerified: row.codesVerified,
    description: row.description,
    remarks: row.remarks,
    dateLabel: dateFmt(row.createdAt),
    reviewedByName: row.reviewedByName,
    reviewedLabel: row.reviewedAt ? dateFmt(row.reviewedAt) : null,
  };
}

export type AdminTransfersResult = {
  items: AdminTransferView[];
  total: number;
  page: number;
  pageCount: number;
  pendingCount: number;
};

export async function getAdminTransfers(params: {
  type?: TransferType | "all";
  status?: TransferStatus | "all";
  page?: number;
}): Promise<AdminTransfersResult> {
  const page = Number.isFinite(params.page) && (params.page ?? 0) > 0 ? Math.floor(params.page!) : 1;
  const where = {
    ...(params.type && params.type !== "all" ? { type: params.type } : {}),
    ...(params.status && params.status !== "all" ? { status: params.status } : {}),
  };

  const [rows, total, pendingCount] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        recipientUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transfer.count({ where }),
    prisma.transfer.count({ where: { status: "pending" } }),
  ]);

  return {
    items: rows.map(present),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pendingCount,
  };
}
