"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";

import { approveRequest, rejectRequest } from "@/app/admin/requests/actions";
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
import type { MoneyRequestReview } from "./types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export function RequestReviewDialog({ request }: { request: MoneyRequestReview }) {
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
          ? await approveRequest(request.id, remarks)
          : await rejectRequest(request.id, remarks);
      if (result.ok) {
        toast.success(
          action === "approve" ? "Request approved — wallet credited" : "Request rejected",
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
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Money Request</DialogTitle>
          <DialogDescription>
            Approve to credit the user&apos;s wallet, or reject the request.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="rounded-lg border px-3">
            <Row label="Transaction ID">
              <span className="font-mono text-xs">{request.txnId}</span>
            </Row>
            <Row label="User">
              <span className="flex flex-col text-right">
                <span>{request.userName}</span>
                <span className="text-muted-foreground text-xs">{request.userEmail}</span>
              </span>
            </Row>
            <Row label="Amount to credit">
              <span className="tabular-nums">
                {formatCurrency(request.amount, request.currency)}
              </span>
            </Row>
            <Row label="Reason">
              <span className="max-w-[16rem] break-words text-right">
                {request.reason?.trim() || "—"}
              </span>
            </Row>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="request-remarks">Add Your Remarks</Label>
            <Textarea
              id="request-remarks"
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
            {pendingAction === "reject" ? "Rejecting…" : "Reject"}
          </Button>
          <Button
            type="button"
            onClick={() => review("approve")}
            disabled={pending}
            className="bg-emerald-700 text-white hover:bg-emerald-700/90"
          >
            <Check className="size-4" />
            {pendingAction === "approve" ? "Approving…" : "Approve & Credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
