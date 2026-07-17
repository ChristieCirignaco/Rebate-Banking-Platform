"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Receipt,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";

import { removeWallet, setDefaultWallet } from "@/app/(app)/wallet/actions";
import { toast } from "@/lib/toast";
import type { WalletCardView } from "@/lib/wallet-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Everything you can do to one wallet, behind one button on its card. The card itself stays a
// balance and a name — the actions live here so the grid stays a grid.
export function ManageWalletDialog({ wallet }: { wallet: WalletCardView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function onMakePrimary() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await setDefaultWallet(wallet.id);
      if (res.ok) {
        toast.success(`${wallet.currency} is now your primary wallet`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  async function onRemove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await removeWallet(wallet.id);
      if (res.ok) {
        toast.success(`${wallet.currency} wallet removed`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusy(false);
    setConfirming(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Reset the destructive confirm on close, so reopening never lands mid-confirm.
        if (!next) {
          setConfirming(false);
          setBusy(false);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Settings2 className="size-4" />
          Manage
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {wallet.currency} wallet
            {wallet.isDefault ? (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
                Primary
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {wallet.name} · {wallet.balanceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/deposit"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
            >
              <ArrowDownToLine className="size-4" />
              Deposit
            </Link>
            <Link
              href="/withdraw"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
            >
              <ArrowUpFromLine className="size-4" />
              Withdraw
            </Link>
          </div>
          <Link
            href="/transactions"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
          >
            <Receipt className="size-4" />
            View transactions
          </Link>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          {wallet.isDefault ? null : (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void onMakePrimary()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
              Make primary
            </Button>
          )}

          {/* removeBlockedReason is computed server-side from the same guards removeWalletFor
              enforces, so the button states the actual reason instead of making the user click
              to discover it. */}
          {wallet.removeBlockedReason ? (
            <p className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-500">
              {wallet.removeBlockedReason}
            </p>
          ) : confirming ? (
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => void onRemove()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm remove
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="size-4" />
              Remove wallet
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
