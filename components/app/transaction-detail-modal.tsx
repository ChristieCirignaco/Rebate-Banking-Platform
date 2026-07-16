"use client";

import type { ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TransactionDetail, TransactionStatus } from "@/lib/transaction-detail";
import { TXN_ICONS } from "@/components/app/transaction-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_STYLE: Record<TransactionStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium break-words text-slate-900">{value}</span>
    </div>
  );
}

// The "Transaction Details" modal. Opens on a row click (no route change). Its data comes from
// the same getTransactionDetail resolver the PDF endpoint uses, so the modal and the receipt
// always show identical fields. `detail` is null while the server action is in flight.
export function TransactionDetailModal({
  open,
  onOpenChange,
  detail,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: TransactionDetail | null;
}) {
  const Icon = detail ? TXN_ICONS[detail.iconKey] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!detail ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <DialogTitle className="sr-only">Transaction Details</DialogTitle>
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div
                className={cn(
                  "mx-auto flex size-12 items-center justify-center rounded-full",
                  detail.positive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {Icon ? <Icon className="size-6" /> : null}
              </div>
              <DialogTitle className="text-center">Transaction Details</DialogTitle>
              <DialogDescription className="text-center">
                {detail.typeDescription}
                <span className="mt-0.5 block text-xs text-slate-400">{detail.dateLabel}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-slate-50 p-4">
              <Field
                label="Transaction ID"
                value={<span className="font-mono text-xs">{detail.reference}</span>}
                className="col-span-2"
              />
              <Field label="Transaction Type" value={detail.typeLabel} />
              <Field label="Provider / Method" value={detail.provider} />
              <Field label="Amount" value={detail.amountLabel} />
              <Field label="Fee" value={detail.feeLabel} />
              <Field label="Net Amount" value={detail.netLabel} />
              <Field label="Payable Amount" value={detail.payableLabel} />
              <div className="col-span-2 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs text-slate-400">Status</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                    STATUS_STYLE[detail.status],
                  )}
                >
                  {detail.statusLabel}
                </span>
              </div>
            </div>

            <a
              href={`/api/transactions/${detail.id}/receipt`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="size-4" />
              PDF Download
            </a>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
