"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock3, Copy, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The outcome surface shown after a money action or a form save. It exists because the old flow
// fired a success toast and then immediately ran `window.location.href` — a hard navigation that
// tears the document down, so the toast never survived to be read and the user landed on
// /transactions with no confirmation at all.
//
// The fix is ordering: show the outcome first, navigate when the user dismisses it. The toast
// still fires (it's the ambient confirmation) but it is no longer the only feedback.
//
// `pending` is its own status on purpose. Deposits, withdrawals and transfers commit as
// `status: "pending"` and are credited only after an admin approves, so calling them "successful"
// would promise money that hasn't moved. Only exchanges settle inline and get "completed".

export type ResultStatus = "completed" | "pending" | "error";

export type ResultDetail = { label: string; value: string };

export type ResultPayload = {
  status: ResultStatus;
  /** Overrides the status default, e.g. "Withdrawal account saved". */
  title?: string;
  message: string;
  /** Rendered large above the details — the amount the action moved. */
  amountLabel?: string;
  /** Transaction reference. Shown monospaced with a copy button. */
  txnId?: string;
  details?: ResultDetail[];
};

const STATUS_CONFIG: Record<
  ResultStatus,
  { icon: typeof Check; title: string; halo: string; icon_: string; pill: string; pillLabel: string }
> = {
  completed: {
    icon: Check,
    title: "Transaction Completed",
    halo: "bg-emerald-50 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20",
    icon_: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    pillLabel: "Completed",
  },
  pending: {
    icon: Clock3,
    title: "Submitted for Review",
    halo: "bg-amber-50 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20",
    icon_: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    pillLabel: "Pending review",
  },
  error: {
    icon: AlertTriangle,
    title: "Transaction Failed",
    halo: "bg-red-50 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20",
    icon_: "text-red-600 dark:text-red-400",
    pill: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    pillLabel: "Failed",
  },
};

function CopyableReference({ txnId }: { txnId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(txnId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable over plain http and in some in-app browsers. The reference is
      // already on screen to copy by hand, so a failure here is not worth an error toast.
      toast.error("Couldn't copy — select the reference to copy it manually.");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      <span className="text-xs text-slate-400">Reference</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy reference ${txnId}`}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs font-medium text-slate-900 transition-colors hover:bg-slate-200/60 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        {txnId}
        {copied ? (
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="size-3.5 text-slate-400" />
        )}
      </button>
    </div>
  );
}

/**
 * The outcome body, without a Dialog wrapper — so `PasscodeDialog` can swap it in place of the
 * PIN form rather than stacking a second dialog on top of itself (which flickers and traps focus
 * in the wrong layer). Use `ResultDialog` below when you need the standalone surface.
 */
export function ResultContent({
  result,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  busy = false,
}: {
  result: ResultPayload;
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Shows a spinner on the primary button while a navigation is in flight. */
  busy?: boolean;
}) {
  const config = STATUS_CONFIG[result.status];
  const Icon = config.icon;
  const isError = result.status === "error";
  const hasPanel = Boolean(result.amountLabel || result.txnId || result.details?.length);

  return (
    <>
      <DialogHeader>
        <div
          className={cn(
            "mx-auto flex size-14 items-center justify-center rounded-full ring-8",
            config.halo,
          )}
        >
          <Icon className={cn("size-7", config.icon_)} strokeWidth={2.5} />
        </div>
        <DialogTitle className="text-center text-lg">{result.title ?? config.title}</DialogTitle>
        <DialogDescription className="text-center">{result.message}</DialogDescription>
      </DialogHeader>

      {result.amountLabel ? (
        <p className="text-center text-3xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
          {result.amountLabel}
        </p>
      ) : null}

      {hasPanel ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
          {(result.details ?? []).map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{detail.label}</span>
              <span className="text-right text-sm font-medium break-words text-slate-900 dark:text-slate-100">
                {detail.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Status</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                config.pill,
              )}
            >
              {config.pillLabel}
            </span>
          </div>
          {result.txnId ? <CopyableReference txnId={result.txnId} /> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onPrimary}
          disabled={busy}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-60",
            isError ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {primaryLabel ?? (isError ? "Try again" : "Done")}
        </button>
        {onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            disabled={busy}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {secondaryLabel ?? "View transaction"}
          </button>
        ) : null}
      </div>
    </>
  );
}

/**
 * Standalone outcome dialog for flows that don't go through the PIN gate — profile saves, payout
 * account changes, password and PIN updates.
 */
export function ResultDialog({
  open,
  onOpenChange,
  result,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: ResultPayload | null;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <Dialog open={open && Boolean(result)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <ResultContent
            result={result}
            onPrimary={onPrimary ?? (() => onOpenChange(false))}
            onSecondary={onSecondary}
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
