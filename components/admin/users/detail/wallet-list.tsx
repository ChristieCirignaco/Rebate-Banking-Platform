"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { assignWallet, removeUserWallet } from "@/app/admin/users/[id]/actions";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DetailWallet } from "./types";

// The user's wallets, plus assign/remove. A user holds a primary wallet (created at signup) and
// up to two extras; the cap and the delete guards live server-side in lib/wallets, and each row
// arrives with `removable` + a reason already computed, so the trash control can explain itself
// rather than fail on click.
export function WalletList({
  userId,
  wallets,
  assignable,
  slotsLeft,
}: {
  userId: string;
  wallets: DetailWallet[];
  assignable: { code: string; name: string }[];
  slotsLeft: number;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(assignable[0]?.code ?? "");
  const [removing, setRemoving] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atCap = slotsLeft <= 0;
  const nothingLeft = assignable.length === 0;

  function onAssign() {
    if (!code || isPending) return;
    startTransition(async () => {
      const res = await assignWallet(userId, code);
      if (res.ok) {
        toast.success(`${code} wallet assigned`);
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  function onRemove(wallet: DetailWallet) {
    setRemoving(wallet.id);
    startTransition(async () => {
      const res = await removeUserWallet(userId, wallet.id);
      if (res.ok) toast.success(`${wallet.currency} wallet removed`);
      else toast.error(res.error);
      setRemoving(null);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Wallets</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={atCap || nothingLeft}
          title={
            atCap
              ? "This user already holds the maximum of 3 wallets"
              : nothingLeft
                ? "This user already holds every active currency"
                : undefined
          }
        >
          <Plus className="size-4" />
          Assign
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="group flex items-center gap-3 rounded-lg border p-2.5"
          >
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {wallet.currency}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{wallet.name}</span>
                {wallet.isDefault ? (
                  <Badge variant="secondary" className="text-[10px]">
                    PRIMARY
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                {wallet.removeBlockedReason ?? "No balance or history — safe to remove"}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(wallet.balance, wallet.currency)}
            </span>
            {/* Revealed on hover, but kept in the tab order and visible on focus so it stays
                reachable by keyboard. Non-removable wallets render nothing at all — the reason
                is already shown in the row. */}
            {wallet.removable ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemove(wallet)}
                disabled={isPending}
                aria-label={`Remove ${wallet.currency} wallet`}
                className="size-8 shrink-0 text-rose-600 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-500/10 dark:text-rose-400"
              >
                {removing === wallet.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign a wallet</DialogTitle>
            <DialogDescription>
              {slotsLeft === 1
                ? "This user can hold 1 more wallet."
                : `This user can hold ${slotsLeft} more wallets.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-currency">Currency</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger id="assign-currency">
                <SelectValue placeholder="Choose a currency" />
              </SelectTrigger>
              <SelectContent>
                {assignable.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onAssign} disabled={isPending || !code}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Assign wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
