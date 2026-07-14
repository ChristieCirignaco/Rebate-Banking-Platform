"use client";

import { useState } from "react";
import { Check, Eye, X } from "lucide-react";

import { approveKycSubmission, rejectKycSubmission } from "@/app/admin/kyc/actions";
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
import { toast } from "@/lib/toast";
import { KycDetailFields } from "./kyc-detail-fields";
import type { KycSubmissionView } from "./types";

export function KycReviewDialog({
  submission,
  onReviewed,
}: {
  submission: KycSubmissionView;
  onReviewed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "approve" | "reject">(null);
  const pending = pendingAction !== null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setRemarks(submission.remarks ?? "");
  }

  async function review(action: "approve" | "reject") {
    setPendingAction(action);
    try {
      const result =
        action === "approve"
          ? await approveKycSubmission(submission.id, remarks)
          : await rejectKycSubmission(submission.id, remarks);
      if (result.ok) {
        toast.success(action === "approve" ? "KYC approved" : "KYC rejected");
        setOpen(false);
        onReviewed();
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
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{submission.templateTitle} Submitted Information</DialogTitle>
          <DialogDescription>
            Review {submission.user.name}&apos;s submission, then approve or reject it.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          {submission.note ? (
            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Note</span>
              <p className="break-words">{submission.note}</p>
            </div>
          ) : null}

          <KycDetailFields fields={submission.fields} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kyc-remarks">Add Your Remarks</Label>
            <Textarea
              id="kyc-remarks"
              rows={2}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional note shared with the user…"
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
            {pendingAction === "reject" ? "Rejecting…" : "Reject KYC"}
          </Button>
          <Button
            type="button"
            onClick={() => review("approve")}
            disabled={pending}
            className="bg-emerald-700 text-white hover:bg-emerald-700/90"
          >
            <Check className="size-4" />
            {pendingAction === "approve" ? "Approving…" : "Approve KYC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
