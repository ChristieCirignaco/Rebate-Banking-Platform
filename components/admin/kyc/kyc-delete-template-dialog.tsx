"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteKycTemplate } from "@/app/admin/kyc/actions";
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
import { toast } from "@/lib/toast";

export function KycDeleteTemplateDialog({
  id,
  title,
  submissionCount,
  children,
}: {
  id: string;
  title: string;
  submissionCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      const result = await deleteKycTemplate(id);
      if (result.ok) {
        toast.success("Template deleted");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete template?</DialogTitle>
          <DialogDescription>
            &ldquo;{title}&rdquo; will be removed.{" "}
            {submissionCount > 0
              ? `Its ${submissionCount} existing submission${submissionCount === 1 ? "" : "s"} stay in the KYC list (kept for the record).`
              : "This template has no submissions."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
