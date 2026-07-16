"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, FileCheck2, FileUp, Info, Landmark, Loader2, Wallet, X, Zap } from "lucide-react";

import { createDeposit, type DepositInput } from "@/app/(app)/deposit/actions";
import type { DepositMethodView, DepositWalletView } from "@/lib/deposits";
import { DEPOSIT_PROOF_ACCEPT } from "@/lib/deposit-proof";
import { formatCurrency } from "@/lib/format";
import { uploadDepositProof } from "@/lib/media";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PasscodeDialog } from "@/components/app/passcode-dialog";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

// The deposit (add money) form: pick a wallet, pick a payment method available for that wallet's
// currency, fill any manual credentials the method requires, enter an amount, and authorize with
// the transaction PIN. Manual methods create a pending request for admin approval; auto methods
// credit immediately. All server-side re-validated in createDeposit.
export function DepositForm({
  wallets,
  methods,
  hasPin,
}: {
  wallets: DepositWalletView[];
  methods: DepositMethodView[];
  hasPin: boolean;
}) {
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id ?? "");
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0];

  const availableMethods = useMemo(
    () => methods.filter((m) => m.currency === (wallet?.currency ?? "")),
    [methods, wallet?.currency],
  );

  const [methodId, setMethodId] = useState<string>(availableMethods[0]?.id ?? "");
  const method = availableMethods.find((m) => m.id === methodId) ?? null;

  const [amount, setAmount] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({}); // field id -> value (or proof URL)
  const [fileNames, setFileNames] = useState<Record<string, string>>({}); // file field id -> display name
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [pinOpen, setPinOpen] = useState(false);

  function resetFields() {
    setFields({});
    setFileNames({});
    setUploading({});
  }
  function onWalletChange(id: string) {
    setWalletId(id);
    const next = methods.filter((m) => m.currency === (wallets.find((w) => w.id === id)?.currency ?? ""));
    setMethodId(next[0]?.id ?? "");
    resetFields();
  }
  function onMethodChange(id: string) {
    setMethodId(id);
    resetFields();
  }

  async function onProofSelect(fieldId: string, file: File | undefined) {
    if (!file) return;
    setUploading((p) => ({ ...p, [fieldId]: true }));
    try {
      const result = await uploadDepositProof(file);
      if (result.ok) {
        setFields((p) => ({ ...p, [fieldId]: result.url }));
        setFileNames((p) => ({ ...p, [fieldId]: file.name }));
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Couldn't upload the file. Please try again.");
    } finally {
      setUploading((p) => ({ ...p, [fieldId]: false }));
    }
  }
  function removeProof(fieldId: string) {
    setFields((p) => {
      const next = { ...p };
      delete next[fieldId];
      return next;
    });
    setFileNames((p) => {
      const next = { ...p };
      delete next[fieldId];
      return next;
    });
  }

  const currency = wallet?.currency ?? "USD";
  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const feeMajor = method
    ? method.chargeType === "percent"
      ? (amountNum * method.chargeValue) / 100
      : method.chargeValue
    : 0;
  const feePreview = Math.max(0, feeMajor);
  const totalPreview = (validAmount ? amountNum : 0) + feePreview;
  const anyUploading = Object.values(uploading).some(Boolean);

  function validate(): string | null {
    if (!wallet) return "Select a wallet.";
    if (!method) return "Select a payment method.";
    if (!validAmount) return "Enter a valid amount.";
    if (method.minAmount > 0 && amountNum < method.minAmount) {
      return `Minimum deposit is ${formatCurrency(method.minAmount, currency)}.`;
    }
    if (method.maxAmount > 0 && amountNum > method.maxAmount) {
      return `Maximum deposit is ${formatCurrency(method.maxAmount, currency)}.`;
    }
    if (method.type === "manual") {
      for (const f of method.fields) {
        if (f.required && !(fields[f.id] ?? "").trim()) return `${f.label} is required.`;
      }
    }
    return null;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (anyUploading) {
      toast.error("Please wait for the upload to finish.");
      return;
    }
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (!hasPin) {
      toast.error("Set up your transaction PIN in Security first.");
      return;
    }
    setPinOpen(true);
  }

  const payload: DepositInput = {
    walletId,
    methodId,
    amount,
    fields: method?.type === "manual" ? fields : undefined,
  };

  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        You don&apos;t have any wallets yet. Please contact support to have one issued.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* Wallet */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wallet" className="text-sm font-semibold">
            Deposit to wallet
          </Label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <select
              id="wallet"
              value={walletId}
              onChange={(e) => onWalletChange(e.target.value)}
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

        {/* Payment method */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="method" className="text-sm font-semibold">
            Payment method
          </Label>
          {availableMethods.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No deposit methods are available for {currency} right now. Try another wallet or contact
              support.
            </p>
          ) : (
            <>
              <div className="relative">
                <Landmark className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="method"
                  value={methodId}
                  onChange={(e) => onMethodChange(e.target.value)}
                  className={cn(SELECT, "pl-9")}
                >
                  {availableMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.gatewayName && m.gatewayName !== m.name ? ` · ${m.gatewayName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {method ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                      method.type === "auto"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700",
                    )}
                  >
                    {method.type === "auto" ? (
                      <>
                        <Zap className="size-3" /> Instant
                      </>
                    ) : (
                      <>
                        <Clock3 className="size-3" /> Manual review
                      </>
                    )}
                  </span>
                  <span>{method.feeLabel}</span>
                  {method.limitLabel ? <span>· {method.limitLabel}</span> : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Manual instructions + credential fields */}
        {method && method.type === "manual" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            {method.instructionsHtml ? (
              <div className="flex gap-2 text-sm text-slate-600">
                <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
                <div
                  className="prose prose-sm max-w-none prose-p:my-1 prose-a:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: method.instructionsHtml }}
                />
              </div>
            ) : null}
            {method.fields.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <Label htmlFor={`f-${f.id}`} className="text-sm font-semibold">
                  {f.label}
                  {f.required ? null : (
                    <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  )}
                </Label>
                {f.type === "select" ? (
                  <select
                    id={`f-${f.id}`}
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
                    id={`f-${f.id}`}
                    value={fields[f.id] ?? ""}
                    onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
                    rows={3}
                    className="rounded-xl border-slate-200 bg-white text-base"
                  />
                ) : f.type === "file" ? (
                  fields[f.id] ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm">
                      <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                        {fileNames[f.id] ?? "File uploaded"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProof(f.id)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600",
                        uploading[f.id] && "pointer-events-none opacity-60",
                      )}
                    >
                      <input
                        type="file"
                        accept={DEPOSIT_PROOF_ACCEPT}
                        className="sr-only"
                        disabled={uploading[f.id]}
                        onChange={(e) => {
                          void onProofSelect(f.id, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      {uploading[f.id] ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <FileUp className="size-4" />
                          Upload file
                        </>
                      )}
                    </label>
                  )
                ) : (
                  <Input
                    id={`f-${f.id}`}
                    type="text"
                    value={fields[f.id] ?? ""}
                    onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
                    className={cn(FIELD, "bg-white")}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Amount */}
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
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate-400">
              {currency}
            </span>
          </div>
        </div>

        {/* Summary */}
        {method && validAmount ? (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Deposit amount</span>
              <span className="font-medium text-slate-700">{formatCurrency(amountNum, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Fee</span>
              <span className="font-medium text-slate-700">{formatCurrency(feePreview, currency)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>Total to pay</span>
              <span>{formatCurrency(totalPreview, currency)}</span>
            </div>
            <p className="text-xs text-slate-400">
              {formatCurrency(amountNum, currency)} will be credited to your {currency} wallet
              {method.type === "manual" ? " after admin approval" : ""}.
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!method || !validAmount || anyUploading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          Deposit now
        </button>

        {!hasPin ? (
          <p className="text-center text-xs text-slate-500">
            You&apos;ll need a transaction PIN.{" "}
            <Link href="/account/security" className="font-semibold text-blue-600 hover:underline">
              Set it up in Security
            </Link>
          </p>
        ) : null}

        <p className="text-center text-xs text-slate-400">
          <Link href="/transactions" className="font-medium text-slate-500 hover:underline">
            View deposit history
          </Link>
        </p>
      </form>

      <PasscodeDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSubmit={(pin) => createDeposit(payload, pin)}
        description="Authorize this deposit with your PIN."
      />
    </>
  );
}
