"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { deleteCurrency } from "@/app/admin/currencies/actions";
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
import type { CurrencyItem } from "./types";

export function DeleteCurrencyDialog({
  currency,
  children,
}: {
  currency: CurrencyItem;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      const result = await deleteCurrency(currency.id);
      if (result.ok) {
        toast.success(`${currency.code} deleted`);
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {currency.name}?</DialogTitle>
          <DialogDescription>
            This removes the {currency.code} currency configuration and its role
            settings.
            {currency.isDefault
              ? " This is the current default currency."
              : ""}{" "}
            Existing user wallets in {currency.code} are not affected. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
