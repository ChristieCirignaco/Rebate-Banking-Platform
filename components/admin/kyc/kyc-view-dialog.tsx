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
import { formatDateTime } from "@/lib/format";
import { KycDetailFields } from "./kyc-detail-fields";
import { KycStatusBadge } from "./kyc-badges";
import type { KycSubmissionView } from "./types";

// Read-only details for an already-processed submission — status + admin remarks + reviewer
// and the same dynamic field rendering. No approve/reject (see KycReviewDialog for pending).
export function KycViewDialog({ submission }: { submission: KycSubmissionView }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {submission.templateTitle} Submitted Information
            <KycStatusBadge status={submission.status} />
          </DialogTitle>
          <DialogDescription>
            {submission.user.name} · {submission.user.email}
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

          {submission.remarks ? (
            <div className="rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Admin remarks</span>
              <p className="break-words">{submission.remarks}</p>
            </div>
          ) : null}

          {submission.reviewedAt ? (
            <p className="text-muted-foreground text-xs">
              Reviewed{submission.reviewedBy ? ` by ${submission.reviewedBy}` : ""} on{" "}
              {formatDateTime(submission.reviewedAt)}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
