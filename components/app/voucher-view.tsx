"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, TicketCheck } from "lucide-react";

import { generateVoucher, redeemVoucher } from "@/app/(app)/voucher/actions";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { isValidVoucherCode, normalizeVoucherCode, VOUCHER_PREFIX } from "@/lib/voucher-code";
import type { VoucherRow, VoucherStatus, VoucherWalletView } from "@/lib/vouchers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

const STATUS_STYLE: Record<VoucherStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  redeemed: "bg-emerald-50 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  canceled: "bg-red-50 text-red-700",
};

export function VoucherView({
  wallets,
  vouchers,
  baseCode,
}: {
  wallets: VoucherWalletView[];
  vouchers: VoucherRow[];
  baseCode: string;
}) {
  const router = useRouter();
  const [genOpen, setGenOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  // Refresh the server component (re-fetches the table + wallet balances) without a full reload.
  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Generate Voucher
        </button>
        <button
          type="button"
          onClick={() => setRedeemOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <TicketCheck className="size-4" />
          Redeem Voucher
        </button>
      </div>

      <VoucherTable vouchers={vouchers} />

      <GenerateModal
        open={genOpen}
        onOpenChange={setGenOpen}
        wallets={wallets}
        baseCode={baseCode}
        onDone={() => {
          setGenOpen(false);
          refresh();
        }}
      />
      <RedeemModal
        open={redeemOpen}
        onOpenChange={setRedeemOpen}
        onDone={() => {
          setRedeemOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function VoucherTable({ vouchers }: { vouchers: VoucherRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">My Vouchers</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Voucher Code</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">For Wallet</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Redeemed On</th>
              <th className="px-4 py-2.5 font-medium">Created On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  You haven&apos;t created any vouchers yet.
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{v.code}</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-slate-900">{v.amountLabel}</td>
                  <td className="px-4 py-3 text-slate-600">{v.currency}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                        STATUS_STYLE[v.status],
                      )}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {v.redeemedOnLabel ? (
                      <span>
                        {v.redeemedOnLabel}
                        {v.redeemedByName ? (
                          <span className="block text-slate-400">by {v.redeemedByName}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.createdOnLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-slate-500", strong && "font-semibold text-slate-700")}>{label}</span>
      <span className={cn("tabular-nums text-slate-700", strong && "font-bold text-slate-900")}>
        {value}
      </span>
    </div>
  );
}

function GenerateModal({
  open,
  onOpenChange,
  wallets,
  baseCode,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  wallets: VoucherWalletView[];
  baseCode: string;
  onDone: () => void;
}) {
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0];
  const currency = wallet?.currency ?? "USD";
  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;

  const fee = wallet && validAmount
    ? wallet.feeType === "percent"
      ? (amountNum * wallet.feeValue) / 100
      : wallet.feeValue
    : 0;
  const total = (validAmount ? amountNum : 0) + fee;
  const rateToBase = wallet && wallet.rate > 0 ? 1 / wallet.rate : 0;

  function reset() {
    setAmount("");
    setError(null);
    setWalletId(wallets[0]?.id ?? "");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!wallet) {
      setError("Select a wallet.");
      return;
    }
    if (!validAmount) {
      setError("Enter a valid amount.");
      return;
    }
    if (amountNum + fee > wallet.balance) {
      setError("Insufficient balance for the voucher amount plus fee.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await generateVoucher({ walletId, amount });
      if (res.ok) {
        toast.success(res.message);
        reset();
        onDone();
        return;
      }
      setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Voucher</DialogTitle>
          <DialogDescription>Create a voucher code from one of your wallets.</DialogDescription>
        </DialogHeader>

        {wallets.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No wallet is available for vouchers right now.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-wallet" className="text-sm font-semibold">
                Select Wallet for Voucher
              </Label>
              <select
                id="v-wallet"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className={SELECT}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} — {w.balanceLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-amount" className="text-sm font-semibold">
                Voucher Amount
              </Label>
              <div className="relative">
                <Input
                  id="v-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(FIELD, "pr-16")}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  {currency}
                </span>
              </div>
              {wallet ? (
                <p className="text-xs text-slate-500">
                  Available: <span className="font-semibold">{wallet.balanceLabel}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
              <SummaryRow label="Voucher Amount" value={formatCurrency(validAmount ? amountNum : 0, currency)} />
              <SummaryRow label="Voucher Fee" value={formatCurrency(fee, currency)} />
              <SummaryRow label="Total Amount" value={formatCurrency(total, currency)} />
              <SummaryRow
                label="Conversion Rate"
                value={`1 ${currency} = ${rateToBase.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${baseCode}`}
              />
              <div className="my-1 border-t border-slate-200" />
              <SummaryRow
                label="Final Voucher Value"
                value={formatCurrency(validAmount ? amountNum : 0, currency)}
                strong
              />
              <SummaryRow label="Payable Amount" value={formatCurrency(total, currency)} strong />
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !validAmount}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Generate Voucher
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RedeemModal({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeVoucherCode(code);
  const formatOk = isValidVoucherCode(normalized);

  function reset() {
    setCode("");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!formatOk) {
      setError(`Code must be ${VOUCHER_PREFIX} followed by 8 letters/numbers.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await redeemVoucher(normalized);
      if (res.ok) {
        toast.success(res.message);
        reset();
        onDone();
        return;
      }
      setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Redeem Voucher</DialogTitle>
          <DialogDescription>Enter a voucher code to credit your wallet.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-code" className="text-sm font-semibold">
              Voucher Code
            </Label>
            <Input
              id="v-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus
              placeholder={`${VOUCHER_PREFIX}XXXXXXXX`}
              maxLength={VOUCHER_PREFIX.length + 8}
              className={cn(FIELD, "font-mono tracking-wide")}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !formatOk}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Redeem
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
