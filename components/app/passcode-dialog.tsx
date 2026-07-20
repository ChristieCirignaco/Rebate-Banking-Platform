"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";

import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResultContent, type ResultPayload, type ResultStatus } from "@/components/app/result-dialog";

export type PasscodeSubmitResult =
  | {
      ok: true;
      next: string;
      message?: string;
      /** "completed" settles inline (exchange); "pending" awaits admin approval. */
      status?: Extract<ResultStatus, "completed" | "pending">;
      txnId?: string;
      amountLabel?: string;
      details?: { label: string; value: string }[];
    }
  | { ok: false; error: string; needPin?: boolean };

// The passcode (transaction PIN) modal — the shared gate before a money action, and so the single
// place that decides what a user sees when a transaction lands.
//
// It used to fire a toast and then immediately hard-navigate to `res.next`. The navigation tore
// the document down before the toast could be read, so every deposit, withdrawal and transfer
// ended as an unexplained jump to /transactions. Now the dialog swaps its own body to the outcome
// and defers the navigation until the user dismisses it — the toast still fires alongside, it
// just isn't the only feedback any more.
export function PasscodeDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "Enter your transaction PIN",
  description = "Authorize this with your PIN.",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (pin: string) => Promise<PasscodeSubmitResult>;
  title?: string;
  description?: string;
}) {
  const [pin, setPin] = useState("");
  const [needPin, setNeedPin] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  function reset() {
    setPin("");
    setNeedPin(false);
    setResult(null);
    setNext(null);
    setLeaving(false);
  }

  // Hard navigation, not router.push: pushing after awaiting a Server Action wedges the router.
  function go(href: string) {
    setLeaving(true);
    window.location.href = href;
  }

  function authorize(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      let res: PasscodeSubmitResult;
      try {
        res = await onSubmit(pin);
      } catch {
        // A thrown Server Action — network drop, a DB error escaping the action's own catch —
        // used to reject unhandled here, leaving the dialog spinning with no explanation. Money
        // flows must always terminate in something the user can read and act on.
        setResult({
          status: "error",
          message:
            "We couldn't reach the server to complete this. Nothing was charged. Check your connection and try again.",
        });
        return;
      }

      if (res.ok) {
        const status = res.status ?? "pending";
        if (res.message) toast.success(res.message);
        setNext(res.next);
        setResult({
          status,
          message:
            res.message ??
            (status === "completed"
              ? "Your transaction completed successfully."
              : "Your request was submitted and is awaiting review."),
          txnId: res.txnId,
          amountLabel: res.amountLabel,
          details: res.details,
        });
        return;
      }

      if (res.needPin) {
        setNeedPin(true);
        toast.error(res.error);
        return;
      }
      // A rejected transaction (insufficient balance, limit breached, wrong PIN, a failed
      // transfer) is shown in the dialog as well as the toast — the toast alone scrolls away
      // before a user reading a failure has finished reading it.
      toast.error(res.error);
      setResult({ status: "error", message: res.error });
    });
  }

  const dismissResult = () => {
    if (next) go(next);
    else onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // While the outcome is on screen the dialog is the confirmation — closing it should take
        // the user onward exactly as the primary button does, not silently drop them back on a
        // form they already submitted.
        if (!nextOpen && result && next) {
          go(next);
          return;
        }
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {result ? (
          <ResultContent
            result={result}
            busy={leaving}
            onPrimary={
              result.status === "error"
                ? () => {
                    // Back to the PIN form with the entered code cleared, so a wrong-PIN or
                    // insufficient-funds failure can be retried without reopening the flow.
                    setResult(null);
                    setPin("");
                  }
                : dismissResult
            }
            // No secondary action here: every success destination is `next`, so a second button
            // would just be a differently-worded duplicate of the first.
            primaryLabel={
              result.status === "error"
                ? "Try again"
                : next === "/transactions"
                  ? "View transactions"
                  : "Done"
            }
          />
        ) : needPin ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-center">{title}</DialogTitle>
              <DialogDescription className="text-center">{description}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              You haven&apos;t set a transaction PIN yet.
              <br />
              <Link href="/account/security" className="font-semibold underline">
                Set it up in Security →
              </Link>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-center">{title}</DialogTitle>
              <DialogDescription className="text-center">{description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={authorize} className="flex flex-col gap-3">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                autoFocus
                placeholder="••••"
                className="h-12 text-center text-lg tracking-[0.5em]"
              />
              <button
                type="submit"
                disabled={pending || pin.length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Authorize
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
