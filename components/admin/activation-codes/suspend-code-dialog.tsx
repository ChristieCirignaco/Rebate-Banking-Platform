"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { setActivationCodeStatus } from "@/app/admin/activation-codes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

export function SuspendCodeDialog({
  id,
  code,
  open,
  onOpenChange,
  onChanged,
}: {
  id: string;
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const result = await setActivationCodeStatus(id, "suspended");
      if (result.ok) {
        toast.success(`${code} has been suspended.`);
        onOpenChange(false);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {code}?</DialogTitle>
          <DialogDescription>
            Users will no longer be able to use it during registration. You can reactivate it
            at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={pending}>
            <Ban className="size-4" />
            {pending ? "Suspending…" : "Suspend Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
