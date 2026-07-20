"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { setTransactionPin } from "@/app/(app)/account/security/actions";
import { toast } from "@/lib/toast";
import { ResultDialog, type ResultPayload } from "@/components/app/result-dialog";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/account/settings-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PIN_INPUT_PROPS = {
  type: "password" as const,
  inputMode: "numeric" as const,
  autoComplete: "off",
  maxLength: 6,
  pattern: "\\d*",
  placeholder: "••••",
};

// Set or change the transaction PIN — the first gate on every transfer. Lives on the security
// page alongside password + 2FA.
export function TransactionPinForm({ hasPin }: { hasPin: boolean }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [enabled, setEnabled] = useState(hasPin);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await setTransactionPin({
        currentPin: enabled ? currentPin : undefined,
        newPin,
        confirmPin,
      });
      if (res.ok) {
        toast.success(
          enabled ? "Transaction PIN updated." : "Transaction PIN set.",
        );
        setResult({
          status: "completed",
          title: enabled ? "Transaction PIN updated" : "Transaction PIN set",
          message: "You'll use this PIN to authorize deposits, withdrawals, transfers and exchanges.",
        });
        setEnabled(true);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast.error(res.error);
        setResult({ status: "error", title: "Couldn't save your PIN", message: res.error });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setResult({
        status: "error",
        title: "Couldn't save your PIN",
        message:
          "We couldn't reach the server. Your PIN is unchanged — check your connection and try again.",
      });
    }
    setSaving(false);
  }

  return (
    <SettingsCard
      icon={KeyRound}
      title="Transaction PIN"
      description={
        enabled
          ? "A PIN is set. It's required to authorize every transfer."
          : "Set a 4–6 digit PIN to authorize transfers."
      }
    >
      <form onSubmit={onSubmit} className="flex max-w-xs flex-col gap-4">
        {enabled ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPin">Current PIN</Label>
            <Input
              id="currentPin"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              disabled={saving}
              {...PIN_INPUT_PROPS}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPin">{enabled ? "New PIN" : "PIN"}</Label>
          <Input
            id="newPin"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            disabled={saving}
            {...PIN_INPUT_PROPS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPin">Confirm PIN</Label>
          <Input
            id="confirmPin"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            disabled={saving}
            {...PIN_INPUT_PROPS}
          />
        </div>
        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {enabled ? "Update PIN" : "Set PIN"}
        </Button>
      </form>

      <ResultDialog
        open={Boolean(result)}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
        result={result}
        primaryLabel={result?.status === "error" ? "Try again" : "Done"}
      />
    </SettingsCard>
  );
}
