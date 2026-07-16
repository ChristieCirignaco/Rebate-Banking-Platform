"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Wallet } from "lucide-react";

import { createExchange } from "@/app/(app)/exchange/actions";
import type { ExchangeWalletView } from "@/lib/exchange";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasscodeDialog } from "@/components/app/passcode-dialog";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

// Convert between two of the user's own wallets. Live preview uses the admin-configured rates
// passed on each wallet; the server (createExchange) recomputes authoritatively and settles
// instantly behind the transaction-PIN gate. Rate convention: wallet.rate = units of that
// currency per 1 unit of the base, so cross-rate(from→to) = rateTo / rateFrom.
export function ExchangeForm({
  wallets,
  hasPin,
}: {
  wallets: ExchangeWalletView[];
  hasPin: boolean;
}) {
  const firstOtherCurrency = wallets.find((w) => w.currency !== wallets[0]?.currency);
  const [fromId, setFromId] = useState<string>(wallets[0]?.id ?? "");
  const [toId, setToId] = useState<string>(firstOtherCurrency?.id ?? wallets[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [pinOpen, setPinOpen] = useState(false);

  const from = wallets.find((w) => w.id === fromId) ?? wallets[0];
  const to = wallets.find((w) => w.id === toId) ?? wallets[1];

  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const crossRate = from && to && from.rate > 0 ? to.rate / from.rate : 0;
  const toAmount = validAmount ? amountNum * crossRate : 0;
  const overBalance = validAmount && from ? amountNum > from.balance : false;

  function pickOther(exclude: string): string {
    return wallets.find((w) => w.id !== exclude)?.id ?? exclude;
  }
  function onFromChange(id: string) {
    setFromId(id);
    if (id === toId) setToId(pickOther(id));
  }
  function onToChange(id: string) {
    setToId(id);
    if (id === fromId) setFromId(pickOther(id));
  }
  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  if (wallets.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        You need at least two currency wallets to exchange. Please contact support to have another
        wallet issued.
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!from || !to || from.id === to.id) {
      toast.error("Choose two different wallets.");
      return;
    }
    if (!validAmount) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (overBalance) {
      toast.error("Insufficient balance in the source wallet.");
      return;
    }
    if (!hasPin) {
      toast.error("Set up your transaction PIN in Security first.");
      return;
    }
    setPinOpen(true);
  }

  const payload = { fromWalletId: fromId, toWalletId: toId, amount };

  function walletSelect(
    id: string,
    value: string,
    label: string,
    onChange: (v: string) => void,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        <div className="relative">
          <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {walletSelect("from", fromId, "From", onFromChange)}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            aria-label="Swap wallets"
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowDownUp className="size-4" />
          </button>
        </div>

        {walletSelect("to", toId, "To", onToChange)}

        <div className="mt-1 flex flex-col gap-1.5">
          <Label htmlFor="amount" className="text-sm font-semibold">
            Amount to exchange
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
              className={cn(FIELD, "pr-16", overBalance && "border-red-400 focus-visible:ring-red-500/20")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400">
              {from?.currency}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Available: <span className="font-semibold">{from?.balanceLabel}</span>
            {overBalance ? <span className="ml-2 font-semibold text-red-600">Exceeds balance</span> : null}
          </p>
        </div>

        {from && to && crossRate > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span>You&apos;ll receive</span>
              <span className="text-base font-bold text-slate-900">
                {formatCurrency(toAmount, to.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Rate</span>
              <span>
                1 {from.currency} = {crossRate.toLocaleString("en-US", { maximumFractionDigits: 8 })}{" "}
                {to.currency}
              </span>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!validAmount || overBalance || !from || !to}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          Exchange now
        </button>

        {!hasPin ? (
          <p className="text-center text-xs text-slate-500">
            You&apos;ll need a transaction PIN.{" "}
            <Link href="/account/security" className="font-semibold text-blue-600 hover:underline">
              Set it up in Security
            </Link>
          </p>
        ) : null}
      </form>

      <PasscodeDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSubmit={(pin) => createExchange(payload, pin)}
        description="Authorize this exchange with your PIN."
      />
    </>
  );
}
