"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";

import { beginTransfer, type SendInput } from "@/app/(app)/send/actions";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// The passcode (transaction PIN) modal — the first gate on every transfer. On success it
// begins the authorization session and routes to the first verification step.
export function PasscodeDialog({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  payload: SendInput | null;
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
    if (!payload || pending) return;
    startTransition(async () => {
      const res = await beginTransfer(payload, pin);
      if (res.ok) {
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
          <DialogTitle className="text-center">Enter your transaction PIN</DialogTitle>
          <DialogDescription className="text-center">
            Authorize this transfer with your PIN.
          </DialogDescription>
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
