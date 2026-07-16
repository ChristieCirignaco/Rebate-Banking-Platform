import { ICON_BY_SOURCE, LABEL_BY_SOURCE, type TxnIconKey } from "@/lib/dashboard/transactions";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";

// The single source of truth for a transaction's detail view — used by BOTH the details modal
// (via a server action) and the PDF receipt endpoint, so the two can never drift. A wallet
// transaction only carries the ledger amount; the fee / net / payable come from the SOURCE
// record (deposit, voucher, …) resolved by referenceType/referenceId. All values are presented
// (formatted strings) here so the client and the PDF render identical, server-sanitized text.

export type TransactionStatus = "pending" | "completed" | "failed";

export type TransactionDetail = {
  id: string; // wallet-transaction id (used in the receipt URL)
  reference: string; // human reference (source txnId / voucher code, else the id) = "Transaction ID"
  typeLabel: string; // "Deposit"
  typeDescription: string; // "Deposit via USDT (TRC20)"
  provider: string; // "USDT (TRC20)" or "—"
  processingType: string; // "manual" | "automatic"
  status: TransactionStatus;
  statusLabel: string; // "Pending"
  currency: string;
  iconKey: TxnIconKey;
  positive: boolean; // credit → green +
  dateLabel: string; // "Jul 16, 2026, 6:11 AM UTC"
  amountLabel: string; // symbol-formatted (modal): "$100.00"
  feeLabel: string;
  netLabel: string;
  payableLabel: string;
  // Raw major amounts — the PDF formats these as "<amount> <CODE>" (code, not symbol) so it is
  // WinAnsi-safe and never renders a currency-glyph bug, while sharing the resolver's numbers.
  amount: number;
  fee: number;
  net: number;
  payable: number;
  pendingStampLabel: string | null; // "PENDING 20.40 USD" when pending, else null
};

function normalizeStatus(raw: string): TransactionStatus {
  const s = raw.toLowerCase();
  if (s === "pending") return "pending";
  if (s === "failed" || s === "canceled" || s === "cancelled" || s === "rejected") return "failed";
  return "completed"; // completed | approved | redeemed | anything else settled
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Resolve a wallet transaction (scoped to the owner — never another user's) into the full detail.
export async function getTransactionDetail(
  userId: string,
  id: string,
): Promise<TransactionDetail | null> {
  const txn = await prisma.walletTransaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      currency: true,
      direction: true,
      amountMinor: true,
      source: true,
      referenceType: true,
      referenceId: true,
      status: true,
      provider: true,
      createdAt: true,
    },
  });
  if (!txn) return null;

  const currency = txn.currency;
  const positive = txn.direction === "credit";
  const magnitude = txn.amountMinor < 0n ? -txn.amountMinor : txn.amountMinor;

  // Defaults for a plain ledger row (rebate/reward/adjustment/fee or no source record).
  const known = (LABEL_BY_SOURCE as Record<string, string>)[txn.source];
  let reference = txn.id;
  let typeLabel = known ?? "Transaction";
  let provider = txn.provider?.trim() ?? "";
  let processingType = "automatic";
  let status = txn.status;
  let iconKey: TxnIconKey = (ICON_BY_SOURCE as Record<string, TxnIconKey>)[txn.source] ?? "adjustment";
  let amountMinor = magnitude;
  let feeMinor = 0n;
  let netMinor = magnitude;
  let payableMinor = magnitude;

  const ref = txn.referenceId;
  if (ref) {
    switch (txn.referenceType) {
      case "deposit": {
        const d = await prisma.deposit.findUnique({
          where: { id: ref },
          select: { txnId: true, type: true, provider: true, amountMinor: true, feeMinor: true, status: true },
        });
        if (d) {
          reference = d.txnId;
          typeLabel = "Deposit";
          provider = d.provider?.trim() || provider;
          processingType = d.type === "manual" ? "manual" : "automatic";
          status = d.status;
          iconKey = "deposit";
          amountMinor = d.amountMinor;
          feeMinor = d.feeMinor;
          netMinor = d.amountMinor; // credited amount
          payableMinor = d.amountMinor + d.feeMinor; // fee charged on top
        }
        break;
      }
      case "voucher": {
        const v = await prisma.voucher.findUnique({
          where: { id: ref },
          select: { code: true, amountMinor: true, feeMinor: true, status: true },
        });
        if (v) {
          reference = v.code;
          typeLabel = "Voucher";
          iconKey = "voucher";
          amountMinor = v.amountMinor;
          feeMinor = v.feeMinor;
          netMinor = v.amountMinor; // face value
          payableMinor = v.amountMinor + v.feeMinor;
        }
        break;
      }
      case "exchange": {
        const e = await prisma.exchange.findUnique({ where: { id: ref }, select: { txnId: true } });
        if (e) {
          reference = e.txnId;
          typeLabel = "Exchange";
          iconKey = "exchange";
        }
        break;
      }
      case "transfer": {
        const t = await prisma.transfer.findUnique({
          where: { id: ref },
          select: { txnId: true, type: true, amountMinor: true, status: true },
        });
        if (t) {
          reference = t.txnId;
          typeLabel = "Transfer";
          provider = provider || cap(t.type);
          processingType = "manual";
          status = t.status;
          iconKey = "transfer";
          amountMinor = t.amountMinor;
          netMinor = t.amountMinor;
          payableMinor = t.amountMinor;
        }
        break;
      }
      case "money_request": {
        const r = await prisma.moneyRequest.findUnique({
          where: { id: ref },
          select: { txnId: true, amountMinor: true, status: true },
        });
        if (r) {
          reference = r.txnId;
          typeLabel = "Money request";
          processingType = "manual";
          status = r.status;
          iconKey = "request";
          amountMinor = r.amountMinor;
          netMinor = r.amountMinor;
          payableMinor = r.amountMinor;
        }
        break;
      }
      case "withdrawal":
      case "withdraw": {
        const w = await prisma.withdraw.findUnique({
          where: { id: ref },
          select: { txnId: true, type: true, provider: true, amountMinor: true, feeMinor: true, status: true },
        });
        if (w) {
          reference = w.txnId;
          typeLabel = "Withdrawal";
          provider = w.provider?.trim() || provider;
          processingType = w.type === "manual" ? "manual" : "automatic";
          status = w.status;
          iconKey = "withdrawal";
          amountMinor = w.amountMinor;
          feeMinor = w.feeMinor;
          netMinor = w.amountMinor - w.feeMinor; // received after fee
          payableMinor = w.amountMinor; // debited from wallet
        }
        break;
      }
    }
  }

  const norm = normalizeStatus(status);
  const p = provider.trim();
  const providerLabel = p || "—";

  return {
    id: txn.id,
    reference,
    typeLabel,
    typeDescription: p && p !== typeLabel ? `${typeLabel} via ${p}` : typeLabel,
    provider: providerLabel,
    processingType,
    status: norm,
    statusLabel: cap(norm),
    currency,
    iconKey,
    positive,
    dateLabel: formatDateTime(txn.createdAt.toISOString()),
    amountLabel: formatCurrency(toMajor(amountMinor), currency),
    feeLabel: formatCurrency(toMajor(feeMinor), currency),
    netLabel: formatCurrency(toMajor(netMinor), currency),
    payableLabel: formatCurrency(toMajor(payableMinor), currency),
    amount: toMajor(amountMinor),
    fee: toMajor(feeMinor),
    net: toMajor(netMinor),
    payable: toMajor(payableMinor),
    pendingStampLabel:
      norm === "pending" ? `PENDING ${toMajor(netMinor).toFixed(2)} ${currency}` : null,
  };
}
