"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { updateProductStatus } from "@/app/admin/products/actions";
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
import type { ProductStatus } from "./types";

// Shared confirm dialog for a single status change. The trigger is supplied by the
// caller (icon button in the list, labeled button on the detail page) via children.
export function StatusChangeDialog({
  productId,
  to,
  title,
  successMessage,
  defaultNote,
  children,
}: {
  productId: string;
  to: ProductStatus;
  title: string;
  successMessage: string;
  defaultNote?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(defaultNote ?? "");
  const [pending, setPending] = useState(false);

  // Pre-fill with the current note each time the dialog opens so a status change never
  // silently erases an existing note — the admin sees it and chooses to keep, edit, or clear it.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setNote(defaultNote ?? "");
  }

  async function handleConfirm() {
    setPending(true);
    const result = await updateProductStatus(productId, to, note);
    setPending(false);
    if (result.ok) {
      toast.success(successMessage);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add any notes about this decision. The user may see this on their submission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-note">Admin Notes (optional)</Label>
          <Textarea
            id="admin-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add any notes about this decision…"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={pending}>
            {pending ? "Updating…" : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
