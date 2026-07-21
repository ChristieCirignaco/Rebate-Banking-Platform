"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";

import { createMoneyRequest } from "@/app/(app)/request/actions";
import type { RequestWalletView } from "@/lib/requests";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/50 dark:focus-visible:bg-slate-900";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:bg-slate-900";

// Create a money request: pick which wallet (currency) to be credited, an amount, and a reason.
// No transaction PIN — nothing moves until an admin approves. On success we hard-navigate back
// to /request so the freshly-created row appears in the list (avoids the post-action router wedge).
export function RequestForm({ wallets }: { wallets: RequestWalletView[] }) {
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0];
  const currency = wallet?.currency ?? "USD";
  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;

  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
        You don&apos;t have any wallets yet. Please contact support to have one issued.
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!validAmount) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createMoneyRequest({ walletId, amount, reason });
      if (res.ok) {
        toast.success(res.message);
        window.location.href = "/request";
        return;
      }
      toast.error(res.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wallet" className="text-sm font-semibold">
          Credit to wallet
        </Label>
        <div className="relative">
          <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select
            id="wallet"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className={cn(SELECT, "pl-9")}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} — {w.balanceLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount" className="text-sm font-semibold">
          Amount
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(FIELD, "pr-16")}
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500">
            {currency}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason" className="text-sm font-semibold">
          Reason <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
        </Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What is this request for?"
          className="rounded-xl border-slate-200 bg-slate-50/70 text-base dark:border-slate-800 dark:bg-slate-800/50"
        />
      </div>

      {validAmount ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          You&apos;re requesting <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(amountNum, currency)}</span>.
          It will be credited to your {currency} wallet once an admin approves.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !validAmount}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit request
      </button>
    </form>
  );
}
