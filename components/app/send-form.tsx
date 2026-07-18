"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe, Landmark, Users } from "lucide-react";

import { beginTransfer, type SendInput } from "@/app/(app)/send/actions";
import type { TransferKind } from "@/components/app/app-nav";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecipientField } from "@/components/app/recipient-field";
import { PasscodeDialog } from "@/components/app/passcode-dialog";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";

type TransferType = TransferKind;

const TYPES: { key: TransferType; label: string; icon: LucideIcon }[] = [
  { key: "internal", label: "Internal", icon: Users },
  { key: "domestic", label: "Domestic", icon: Landmark },
  { key: "wire", label: "Wire", icon: Globe },
];

// `kinds` is resolved from the per-type feature flags on the server. The form renders only
// those tabs; beginTransfer re-checks, since a hidden tab is presentation, not a constraint.
export function SendForm({
  balanceLabel,
  currency,
  kinds,
}: {
  balanceLabel: string;
  currency: string;
  kinds: TransferKind[];
}) {
  const available = TYPES.filter((t) => kinds.includes(t.key));
  const [type, setType] = useState<TransferType>(available[0]?.key ?? "internal");
  const [values, setValues] = useState<Record<string, string>>({ amount: "" });
  const [pinOpen, setPinOpen] = useState(false);

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
          className={FIELD}
          {...extra}
        />
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (type === "internal" && (values.recipient ?? "").trim().length < 3) {
      toast.error("Enter a recipient.");
      return;
    }
    // Everything else is validated server-side in beginTransfer; open the passcode gate.
    setPinOpen(true);
  }

  const payload = { type, ...values } as SendInput;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* Columns follow the number of ENABLED transfer types: disabling one in admin reflows
            3 → 2 → 1 with no empty column, and a single remaining type spans the full width.
            An inline template rather than grid-cols-* classes, since the count is dynamic — this
            can't silently break if the class for a given count isn't generated. */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(available.length, 1)}, minmax(0, 1fr))` }}
        >
          {available.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors sm:gap-2 sm:px-3 sm:py-3.5",
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors sm:size-9",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold sm:text-sm",
                    active ? "text-white" : "text-slate-700 dark:text-slate-200",
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
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

        {type === "internal" ? (
          <RecipientField value={values.recipient ?? ""} onChange={(v) => set("recipient", v)} />
        ) : null}

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
          </>
        ) : null}

        {field("description", "Note (optional)", { placeholder: "What's this for?" })}

        <button
          type="submit"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          Continue
        </button>
      </form>

      <PasscodeDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSubmit={(pin) => beginTransfer(payload, pin)}
        description="Authorize this transfer with your PIN."
      />
    </>
  );
}
