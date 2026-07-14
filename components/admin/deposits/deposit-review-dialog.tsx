"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";

import { approveDeposit, rejectDeposit } from "@/app/admin/deposits/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { DepositRequest } from "./types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export function DepositReviewDialog({ request }: { request: DepositRequest }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "approve" | "reject">(null);
  const pending = pendingAction !== null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setRemarks("");
  }

  async function review(action: "approve" | "reject") {
    setPendingAction(action);
    try {
      const result =
        action === "approve"
          ? await approveDeposit(request.id, remarks)
          : await rejectDeposit(request.id, remarks);
      if (result.ok) {
        toast.success(
          action === "approve" ? "Deposit approved — wallet credited" : "Deposit rejected",
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          Review Request
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Deposit Details</DialogTitle>
          <DialogDescription>
            Review the submission and approve to credit the wallet, or reject it.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Deposit Information</p>
            <div className="rounded-lg border px-3">
              <Row label="Transaction ID">
                <span className="font-mono text-xs">{request.txnId}</span>
              </Row>
              <Row label="Payment Method">
                <Badge variant="secondary">{request.methodName}</Badge>
              </Row>
              <Row label="Amount to deposit">
                <span className="tabular-nums">
                  {formatCurrency(request.amount, request.currency)}
                </span>
              </Row>
              <Row label="Fee">
                <span className="tabular-nums">
                  {formatCurrency(request.fee, request.currency)}
                </span>
              </Row>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Account Details for deposit</p>
            {request.fieldValues.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                No additional details were submitted.
              </p>
            ) : (
              <div className="rounded-lg border px-3">
                {request.fieldValues.map((field, index) => (
                  <Row key={`${field.label}-${index}`} label={field.label}>
                    <span className="break-all">{field.value || "—"}</span>
                  </Row>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-remarks">Add Your Remarks</Label>
            <Textarea
              id="deposit-remarks"
              rows={2}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional note visible to the user…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => review("reject")}
            disabled={pending}
          >
            <X className="size-4" />
            {pendingAction === "reject" ? "Rejecting…" : "Reject Deposit"}
          </Button>
          <Button
            type="button"
            onClick={() => review("approve")}
            disabled={pending}
            className="bg-emerald-700 text-white hover:bg-emerald-700/90"
          >
            <Check className="size-4" />
            {pendingAction === "approve" ? "Approving…" : "Approve Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
