"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Bitcoin, Loader2, Plus, ShieldAlert, Trash2, Wallet } from "lucide-react";

import {
  checkWithdrawGate,
  createWithdraw,
  createWithdrawalAccount,
  deleteWithdrawalAccount,
} from "@/app/(app)/withdraw/actions";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { WithdrawAccountView, WithdrawData, WithdrawMethodView } from "@/lib/withdrawals";
import { PasscodeDialog } from "@/components/app/passcode-dialog";
import { ResultDialog, type ResultPayload } from "@/components/app/result-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/50 dark:focus-visible:bg-slate-900";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:bg-slate-900";

export function WithdrawView({ data }: { data: WithdrawData }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  // Owned here rather than inside AddAccountDialog: that surface is itself a Dialog, and stacking
  // one on another traps focus in the wrong layer. The child closes, the parent reports.
  const [result, setResult] = useState<ResultPayload | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Withdrawal accounts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Where your money is sent.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add account
        </button>
      </div>

      <AccountList
        accounts={data.accounts}
        onChanged={() => router.refresh()}
        onResult={setResult}
      />

      {/* The withdrawal-control gate is deliberately NOT shown here. A user who is paused still
          fills the form normally; the control is checked when they submit, and the admin's
          message is delivered as a dialog at that point. Showing it up front told people they
          were blocked before they had asked for anything. */}
      <WithdrawForm data={data} />

      <AddAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        methods={data.methods}
        onSaved={() => {
          setAddOpen(false);
          router.refresh();
          setResult({
            status: "completed",
            title: "Withdrawal account saved",
            message: "You can now select this account when requesting a withdrawal.",
          });
        }}
      />

      <ResultDialog
        open={Boolean(result)}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
        result={result}
        primaryLabel={result?.status === "error" ? "Try again" : "Done"}
      />
    </div>
  );
}

function AccountList({
  accounts,
  onChanged,
  onResult,
}: {
  accounts: WithdrawAccountView[];
  onChanged: () => void;
  onResult: (result: ResultPayload) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    try {
      const res = await deleteWithdrawalAccount(id);
      if (res.ok) {
        toast.success("Account removed");
        onChanged();
        onResult({
          status: "completed",
          title: "Account removed",
          message: "That payout account is no longer on your profile.",
        });
      } else {
        toast.error(res.error);
        onResult({ status: "error", title: "Couldn't remove the account", message: res.error });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      onResult({
        status: "error",
        title: "Couldn't remove the account",
        message:
          "We couldn't reach the server. The account is unchanged — check your connection and try again.",
      });
    }
    setRemoving(null);
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
        <Banknote className="size-6 text-slate-300 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No withdrawal account yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Add a bank account or crypto address to withdraw.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {accounts.map((a) => (
        <div key={a.id} className="flex items-center gap-3 p-3.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              a.kind === "crypto"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
            )}
          >
            {a.kind === "crypto" ? <Bitcoin className="size-4" /> : <Banknote className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{a.label}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {a.methodName} · {a.currency}
              {a.summary ? ` · ${a.summary}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(a.id)}
            disabled={removing === a.id}
            aria-label={`Remove ${a.label}`}
            className="shrink-0 text-slate-300 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-red-400"
          >
            {removing === a.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function WithdrawForm({ data }: { data: WithdrawData }) {
  const [walletId, setWalletId] = useState(data.wallets[0]?.id ?? "");
  const wallet = data.wallets.find((w) => w.id === walletId) ?? data.wallets[0];
  const currency = wallet?.currency ?? "USD";

  const usable = data.accounts.filter((a) => a.currency === currency);
  const [accountId, setAccountId] = useState(usable[0]?.id ?? "");
  const account = usable.find((a) => a.id === accountId) ?? usable[0];

  const [amount, setAmount] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [, startCheck] = useTransition();

  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const fee = account && validAmount
    ? account.chargeType === "percent"
      ? (amountNum * account.chargeValue) / 100
      : account.chargeValue
    : 0;
  const receive = Math.max(0, (validAmount ? amountNum : 0) - fee);
  const overBalance = validAmount && wallet ? amountNum > wallet.balance : false;

  function onWalletChange(id: string) {
    setWalletId(id);
    const cur = data.wallets.find((w) => w.id === id)?.currency;
    const next = data.accounts.filter((a) => a.currency === cur);
    setAccountId(next[0]?.id ?? "");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (checking) return;
    if (!wallet) return toast.error("Select a wallet.");
    if (!account) return toast.error("Add a withdrawal account for this currency first.");
    if (!validAmount) return toast.error("Enter a valid amount.");
    if (overBalance) return toast.error("Insufficient wallet balance.");
    if (fee >= amountNum) return toast.error("This amount doesn't cover the withdrawal fee.");
    if (!data.hasPin) return toast.error("Set up your transaction PIN in Security first.");

    // The withdrawal control is checked HERE — after the form is filled and the user has
    // committed to withdrawing, not before. A blocked account gets the admin's message and
    // stops: the PIN dialog never opens, createWithdraw is never called, and nothing is
    // written or held in session, so the attempt leaves no trace.
    setChecking(true);
    startCheck(async () => {
      let gate: Awaited<ReturnType<typeof checkWithdrawGate>>;
      try {
        gate = await checkWithdrawGate();
      } catch {
        setChecking(false);
        toast.error("We couldn't verify your withdrawal status. Please try again.");
        return;
      }
      setChecking(false);
      if (!gate.allowed) {
        toast.error("Withdrawal unavailable on your account.");
        setBlockedReason(gate.reason);
        return;
      }
      setPinOpen(true);
    });
  }

  if (data.wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
        You don&apos;t have any wallets yet. Please contact support.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="w-wallet" className="text-sm font-semibold">
            Withdraw from wallet
          </Label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <select
              id="w-wallet"
              value={walletId}
              onChange={(e) => onWalletChange(e.target.value)}
              className={cn(SELECT, "pl-9")}
            >
              {data.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} — {w.balanceLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="w-account" className="text-sm font-semibold">
            Withdrawal account
          </Label>
          {usable.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              No {currency} withdrawal account yet — add one above to withdraw from this wallet.
            </p>
          ) : (
            <>
              <select
                id="w-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={SELECT}
              >
                {usable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.methodName}
                  </option>
                ))}
              </select>
              {account ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                      account.kind === "crypto"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
                    )}
                  >
                    {account.kind === "crypto" ? (
                      <Bitcoin className="size-3" />
                    ) : (
                      <Banknote className="size-3" />
                    )}
                    {account.kind === "crypto" ? "Crypto" : "Bank"}
                  </span>
                  {account.minAmount > 0 || account.maxAmount > 0 ? (
                    <span>
                      {account.minAmount > 0 ? `min ${formatCurrency(account.minAmount, currency)}` : ""}
                      {account.minAmount > 0 && account.maxAmount > 0 ? " · " : ""}
                      {account.maxAmount > 0 ? `max ${formatCurrency(account.maxAmount, currency)}` : ""}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="w-amount" className="text-sm font-semibold">
            Amount
          </Label>
          <div className="relative">
            <Input
              id="w-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(FIELD, "pr-16", overBalance && "border-red-400")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500">
              {currency}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Available: <span className="font-semibold">{wallet?.balanceLabel}</span>
            {overBalance ? <span className="ml-2 font-semibold text-red-600 dark:text-red-400">Exceeds balance</span> : null}
            {data.limits.dailyLimit > 0 ? (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                Daily limit {formatCurrency(data.limits.dailyLimit, currency)}
              </span>
            ) : null}
          </p>
        </div>

        {account && validAmount ? (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Withdraw amount</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(amountNum, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Fee</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(fee, currency)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
              <span>You&apos;ll receive</span>
              <span>{formatCurrency(receive, currency)}</span>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!account || !validAmount || overBalance || checking}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {checking ? <Loader2 className="size-4 animate-spin" /> : null}
          {checking ? "Checking…" : "Withdraw now"}
        </button>

        {!data.hasPin ? (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            You&apos;ll need a transaction PIN.{" "}
            <Link href="/account/security" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Set it up in Security
            </Link>
          </p>
        ) : null}
      </form>

      {/* The admin's withdrawal-control message, shown only once the user has actually tried to
          withdraw. Purely informational — no retry, because nothing was attempted or stored. */}
      <Dialog
        open={Boolean(blockedReason)}
        onOpenChange={(open) => {
          if (!open) setBlockedReason(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20">
              <ShieldAlert className="size-7 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            </div>
            <DialogTitle className="text-center text-lg">Withdrawal unavailable</DialogTitle>
            <DialogDescription className="text-center">
              {blockedReason}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setBlockedReason(null)}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>

      <PasscodeDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        // Send the resolved ids, not the raw state: both fall back to the first option when a
        // refresh (e.g. adding an account) leaves the selected id stale or empty.
        onSubmit={(pin) =>
          createWithdraw({ walletId: wallet?.id ?? "", accountId: account?.id ?? "", amount }, pin)
        }
        description="Authorize this withdrawal with your PIN."
        hasPin={data.hasPin}
      />
    </>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
  methods,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  methods: WithdrawMethodView[];
  onSaved: () => void;
}) {
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const method = methods.find((m) => m.id === methodId) ?? methods[0];

  function reset() {
    setMethodId(methods[0]?.id ?? "");
    setFields({});
    setLabel("");
    setError(null);
    setSaving(false);
  }
  function onMethodChange(id: string) {
    setMethodId(id);
    setFields({});
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || !method) return;
    setError(null);
    for (const f of method.fields) {
      if (f.required && !(fields[f.id] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await createWithdrawalAccount({ methodId: method.id, label, fields });
      if (res.ok) {
        toast.success("Withdrawal account saved");
        reset();
        onSaved();
        return;
      }
      setError(res.error);
    } catch {
      // Stays inline rather than becoming a result dialog — this form is already a modal, and
      // replacing it would discard every field the user just filled in.
      setError("We couldn't reach the server. Your details are still here — please try again.");
    }
    setSaving(false);
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
          <DialogTitle>Add withdrawal account</DialogTitle>
          <DialogDescription>
            Pick a method
          </DialogDescription>
        </DialogHeader>

        {methods.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            No withdrawal methods are available for your wallets right now.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-method" className="text-sm font-semibold">
                Withdrawal method
              </Label>
              <select
                id="a-method"
                value={methodId}
                onChange={(e) => onMethodChange(e.target.value)}
                className={SELECT}
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.kind === "crypto" ? "Crypto" : "Bank"} · {m.name} ({m.currency})
                  </option>
                ))}
              </select>
              {method ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {method.feeLabel}
                  {method.limitLabel ? ` · ${method.limitLabel}` : ""}
                </p>
              ) : null}
            </div>

            {/* The method's own admin-defined fields — bank details or a crypto address. */}
            {method?.fields.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <Label htmlFor={`af-${f.id}`} className="text-sm font-semibold">
                  {f.label}
                  {f.required ? null : (
                    <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">(optional)</span>
                  )}
                </Label>
                {f.type === "select" ? (
                  <select
                    id={`af-${f.id}`}
                    value={fields[f.id] ?? ""}
                    onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
                    className={SELECT}
                  >
                    <option value="">Select {f.label.toLowerCase()}</option>
                    {f.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <Textarea
                    id={`af-${f.id}`}
                    rows={3}
                    value={fields[f.id] ?? ""}
                    onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
                    className="rounded-xl border-slate-200 bg-slate-50/70 text-base dark:border-slate-800 dark:bg-slate-800/50"
                  />
                ) : (
                  <Input
                    id={`af-${f.id}`}
                    value={fields[f.id] ?? ""}
                    onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
                    className={FIELD}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-label" className="text-sm font-semibold">
                Nickname <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
              </Label>
              <Input
                id="a-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                className={FIELD}
              />
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save account
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
