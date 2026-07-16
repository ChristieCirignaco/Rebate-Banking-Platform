"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { createTransfer, type SendInput } from "@/app/(app)/send/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";

type TransferType = "internal" | "domestic" | "wire";

const TYPES: { key: TransferType; label: string; hint: string }[] = [
  { key: "internal", label: "Internal", hint: "To another user" },
  { key: "domestic", label: "Domestic", hint: "Local bank" },
  { key: "wire", label: "Wire", hint: "International" },
];

export function SendForm({
  balanceLabel,
  currency,
}: {
  balanceLabel: string;
  currency: string;
}) {
  const [type, setType] = useState<TransferType>("internal");
  const [values, setValues] = useState<Record<string, string>>({ amount: "" });
  const [submitting, setSubmitting] = useState(false);

  const set = (name: string, value: string) => setValues((p) => ({ ...p, [name]: value }));

  function field(
    name: string,
    label: string,
    extra: InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={name} className="text-sm font-semibold">
          {label}
        </Label>
        <Input
          id={name}
          value={values[name] ?? ""}
          onChange={(e) => set(name, e.target.value)}
          disabled={submitting}
          className={FIELD}
          {...extra}
        />
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = { type, ...values } as SendInput;
    try {
      const res = await createTransfer(payload);
      if (res.ok) {
        toast.success(`Transfer ${res.txnId} submitted for review.`);
        window.location.href = "/transactions";
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
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              type === t.key
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700",
            )}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.hint}</p>
          </button>
        ))}
      </div>

      <div>
        {field("amount", `Amount (${currency})`, {
          type: "number",
          inputMode: "decimal",
          min: "0",
          step: "0.01",
          placeholder: "0.00",
        })}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Available: <span className="font-semibold">{balanceLabel}</span>
        </p>
      </div>

      {type === "internal"
        ? field("recipient", "Recipient (email or @username)", {
            placeholder: "name@example.com",
          })
        : null}

      {type === "domestic" ? (
        <>
          {field("bankName", "Bank name")}
          {field("accountName", "Account name")}
          {field("accountNumber", "Account number", { inputMode: "numeric" })}
          {field("routingNumber", "Routing number (optional)", { inputMode: "numeric" })}
        </>
      ) : null}

      {type === "wire" ? (
        <>
          {field("bankName", "Bank name")}
          {field("accountName", "Account name")}
          {field("swift", "SWIFT / BIC")}
          {field("iban", "IBAN (optional)")}
          {field("accountNumber", "Account number (optional)", { inputMode: "numeric" })}
          {field("country", "Bank country")}

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <ShieldCheck className="size-4" />
              Transfer authorization codes
            </div>
            <div className="flex flex-col gap-3">
              {field("imf", "IMF code")}
              {field("tax", "TAX code")}
              {field("cot", "COT code")}
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400/80">
              Required for international wires. Contact support if you don&apos;t have your codes.
            </p>
          </div>
        </>
      ) : null}

      {field("description", "Note (optional)", { placeholder: "What's this for?" })}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Send transfer"
        )}
      </button>
    </form>
  );
}
