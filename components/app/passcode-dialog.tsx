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

export type PasscodeSubmitResult =
  | { ok: true; next: string; message?: string }
  | { ok: false; error: string; needPin?: boolean };

// The passcode (transaction PIN) modal — the shared gate before a money action. On success it
// runs the caller's `onSubmit` and navigates to the returned route (used by transfers to enter
// the step flow, and by deposits to land on the transaction history).
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

  function reset() {
    setPin("");
    setNeedPin(false);
  }

  function authorize(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await onSubmit(pin);
      if (res.ok) {
        if (res.message) toast.success(res.message);
        window.location.href = res.next;
        return;
      }
      if (res.needPin) setNeedPin(true);
      toast.error(res.error);
    });
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
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <KeyRound className="size-5" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        {needPin ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            You haven&apos;t set a transaction PIN yet.
            <br />
            <Link href="/account/security" className="font-semibold underline">
              Set it up in Security →
            </Link>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
