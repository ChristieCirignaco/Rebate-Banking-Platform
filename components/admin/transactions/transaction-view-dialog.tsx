"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserTxnCell } from "@/components/admin/deposits/shared";
import { sourceLabel, TransactionStatusBadge } from "./transaction-badges";
import type { TransactionView } from "./types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium break-words">{children}</span>
    </div>
  );
}

export function TransactionViewDialog({ transaction }: { transaction: TransactionView }) {
  const [open, setOpen] = useState(false);
  const positive = transaction.direction === "credit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>Full ledger entry for this transaction.</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="flex items-center justify-between gap-3">
            <UserTxnCell user={transaction.user} txnId={`#${transaction.id.slice(0, 8)}`} />
            <TransactionStatusBadge status={transaction.status} />
          </div>

          <div className="rounded-lg border px-3">
            <Row label="Amount">
              <span
                className={cn(
                  "tabular-nums",
                  positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {positive ? "+" : "−"}
                {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
              </span>
            </Row>
            <Row label="Type">{sourceLabel(transaction.source)}</Row>
            <Row label="Direction">
              <span className="capitalize">{transaction.direction}</span>
            </Row>
            <Row label="Currency">{transaction.currency}</Row>
            <Row label="Balance after">
              <span className="tabular-nums">
                {formatCurrency(transaction.balanceAfter, transaction.currency)}
              </span>
            </Row>
            <Row label="Provider">{transaction.provider ?? "—"}</Row>
            <Row label="Description">{transaction.description ?? "—"}</Row>
            {transaction.memo ? <Row label="Memo">{transaction.memo}</Row> : null}
            {transaction.referenceType || transaction.referenceId ? (
              <Row label="Reference">
                <span className="font-mono text-xs">
                  {[transaction.referenceType, transaction.referenceId].filter(Boolean).join(" · ")}
                </span>
              </Row>
            ) : null}
            <Row label="Transaction ID">
              <span className="font-mono text-xs break-all">{transaction.id}</span>
            </Row>
            <Row label="Date">{formatDateTime(transaction.createdAt)}</Row>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
