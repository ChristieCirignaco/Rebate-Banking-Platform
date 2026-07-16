"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { approveTransfer, rejectTransfer } from "@/app/admin/transfers/actions";
import type { AdminTransfersResult } from "@/lib/admin/transfers";
import {
  TRANSFER_STATUSES,
  TRANSFER_TYPES,
  type AdminTransferView,
  type TransferStatus,
  type TransferType,
} from "@/components/admin/transfers/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TYPE_CLASS: Record<TransferType, string> = {
  internal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  domestic: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  wire: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

const STATUS_CLASS: Record<TransferStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  canceled: "bg-red-500/10 text-red-600 dark:text-red-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function buildHref(type: string, status: string, page?: number): string {
  const p = new URLSearchParams();
  if (type !== "all") p.set("type", type);
  if (status !== "all") p.set("status", status);
  if (page && page > 1) p.set("page", String(page));
  const q = p.toString();
  return `/admin/transfers${q ? `?${q}` : ""}`;
}

function FilterRow({
  label,
  options,
  active,
  build,
}: {
  label: string;
  options: string[];
  active: string;
  build: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground w-14 text-xs font-medium">{label}</span>
      {options.map((opt) => (
        <Link
          key={opt}
          href={build(opt)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            active === opt
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          {opt === "all" ? "All" : cap(opt)}
        </Link>
      ))}
    </div>
  );
}

export function TransfersView({
  data,
  activeType,
  activeStatus,
}: {
  data: AdminTransfersResult;
  activeType: TransferType | "all";
  activeStatus: TransferStatus | "all";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminTransferView | null>(null);
  const [remarks, setRemarks] = useState("");
  const [pending, startTransition] = useTransition();

  function review(action: "approve" | "reject") {
    if (!selected) return;
    const fn = action === "approve" ? approveTransfer : rejectTransfer;
    startTransition(async () => {
      const res = await fn(selected.id, remarks);
      if (res.ok) {
        toast.success(action === "approve" ? "Transfer approved" : "Transfer rejected");
        setSelected(null);
        setRemarks("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FilterRow
          label="Type"
          options={["all", ...TRANSFER_TYPES]}
          active={activeType}
          build={(v) => buildHref(v, activeStatus)}
        />
        <FilterRow
          label="Status"
          options={["all", ...TRANSFER_STATUSES]}
          active={activeStatus}
          build={(v) => buildHref(activeType, v)}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">
                  No transfers found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs">{t.txnId}</span>
                      <Badge className={cn("w-fit border-0 font-medium", TYPE_CLASS[t.type])}>
                        {cap(t.type)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="text-muted-foreground truncate">{t.senderEmail}</span>
                      <span className="font-medium">→ {t.recipientLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{t.amountLabel}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 font-medium", STATUS_CLASS[t.status])}>
                      {cap(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{t.dateLabel}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={t.status === "pending" ? "default" : "outline"}
                      onClick={() => {
                        setSelected(t);
                        setRemarks("");
                      }}
                    >
                      {t.status === "pending" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <PageLink href={buildHref(activeType, activeStatus, data.page - 1)} disabled={data.page <= 1}>
            Previous
          </PageLink>
          <span className="text-muted-foreground text-xs">
            Page {data.page} of {data.pageCount}
          </span>
          <PageLink
            href={buildHref(activeType, activeStatus, data.page + 1)}
            disabled={data.page >= data.pageCount}
          >
            Next
          </PageLink>
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{selected?.txnId}</DialogTitle>
          </DialogHeader>
          {selected ? <TransferDetail t={selected} /> : null}
          {selected?.status === "pending" ? (
            <>
              <Textarea
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
              />
              <DialogFooter>
                <Button variant="destructive" disabled={pending} onClick={() => review("reject")}>
                  Reject & refund
                </Button>
                <Button disabled={pending} onClick={() => review("approve")}>
                  Approve
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function TransferDetail({ t }: { t: AdminTransferView }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="divide-y rounded-lg border px-3">
        <DetailRow label="Type" value={cap(t.type)} />
        <DetailRow label="Amount" value={t.amountLabel} />
        <DetailRow label="Fee" value={t.feeLabel} />
        <DetailRow label="Sender" value={`${t.senderName} (${t.senderEmail})`} />
        <DetailRow
          label="Recipient"
          value={t.recipientSub ? `${t.recipientLabel} · ${t.recipientSub}` : t.recipientLabel}
        />
        {t.type === "wire" ? (
          <DetailRow label="Codes cleared" value={t.codesVerified ? "Yes" : "No"} />
        ) : null}
        <DetailRow label="Submitted" value={t.dateLabel} />
        {t.reviewedByName ? (
          <DetailRow label="Reviewed by" value={`${t.reviewedByName}${t.reviewedLabel ? ` · ${t.reviewedLabel}` : ""}`} />
        ) : null}
      </div>

      {t.bankDetails.length > 0 ? (
        <div className="divide-y rounded-lg border px-3">
          {t.bankDetails.map((d) => (
            <DetailRow key={d.label} label={d.label} value={d.value} />
          ))}
        </div>
      ) : null}

      {t.description ? (
        <p className="text-muted-foreground">Note: {t.description}</p>
      ) : null}
      {t.remarks ? (
        <p className="rounded-lg bg-muted p-2.5 text-xs">Admin remarks: {t.remarks}</p>
      ) : null}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="text-muted-foreground cursor-not-allowed rounded-md border px-3 py-1.5 text-xs opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="hover:bg-muted rounded-md border px-3 py-1.5 text-xs transition-colors">
      {children}
    </Link>
  );
}
