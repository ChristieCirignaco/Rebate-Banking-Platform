"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { resendTransferOtp, verifyTransferStep } from "@/app/(app)/send/actions";
import type { TransferStep } from "@/lib/transfer-auth";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { ResultDialog, type ResultPayload } from "@/components/app/result-dialog";

const META: Record<TransferStep, { title: string; hint: string }> = {
  imf: { title: "IMF authorization code", hint: "Enter your IMF code to continue." },
  tax: { title: "TAX authorization code", hint: "Enter your TAX code to continue." },
  cot: { title: "COT authorization code", hint: "Enter your COT code to continue." },
  otp: { title: "Email verification code", hint: "Enter the 6-digit code we emailed you." },
};

export function VerifyStepForm({
  step,
  stepIndex,
  stepTotal,
  amountLabel,
  recipientLabel,
}: {
  step: TransferStep;
  stepIndex: number;
  stepTotal: number;
  amountLabel: string;
  recipientLabel: string;
}) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const meta = META[step];
  const isOtp = step === "otp";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !code.trim()) return;
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof verifyTransferStep>>;
      try {
        res = await verifyTransferStep(step, code.trim());
      } catch {
        // A thrown action left this form spinning with no explanation. The transfer is mid-flow
        // and money may be on hold, so the user has to be told to check rather than blindly retry.
        setResult({
          status: "error",
          message:
            "We couldn't reach the server to verify this step. Check your connection, then review your transactions before trying again.",
        });
        return;
      }

      if (res.ok) {
        // Intermediate steps just advance to the next code; only the final one has an outcome
        // worth stopping on.
        if (!res.done) {
          window.location.href = res.next;
          return;
        }
        const message = res.message ?? "Transfer submitted for review.";
        toast.success(message);
        setNext(res.next);
        setResult({
          status: res.status ?? "pending",
          message,
          txnId: res.txnId,
          amountLabel: res.amountLabel,
          details: res.details,
        });
        return;
      }
      toast.error(res.error);
      setResult({ status: "error", message: res.error });
      setCode("");
    });
  }

  function resend() {
    startResend(async () => {
      const res = await resendTransferOtp();
      if (res.ok) toast.success("A new code was sent to your email.");
      else toast.error(res.error ?? "Couldn't resend the code.");
    });
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
        Step {stepIndex} of {stepTotal}
      </p>
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <ShieldCheck className="size-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {meta.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.hint}</p>
      </div>
      <p className="rounded-xl bg-slate-50 p-2.5 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        Sending <span className="font-semibold">{amountLabel}</span> to{" "}
        <span className="font-semibold">{recipientLabel}</span>
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          value={code}
          onChange={(e) => setCode(isOtp ? e.target.value.replace(/\D/g, "") : e.target.value)}
          inputMode={isOtp ? "numeric" : "text"}
          maxLength={isOtp ? 6 : 40}
          autoComplete="off"
          autoFocus
          placeholder={isOtp ? "••••••" : "Enter code"}
          className="h-12 text-center text-lg tracking-widest"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isOtp ? "Verify & submit" : "Continue"}
        </button>
      </form>

      {isOtp ? (
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60 dark:text-blue-400"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
      ) : null}

      <ResultDialog
        open={Boolean(result)}
        // Dismissing a submitted transfer goes onward; dismissing a failure returns to the code
        // form so the step can be retried.
        onOpenChange={(open) => {
          if (open) return;
          if (next) window.location.href = next;
          else setResult(null);
        }}
        result={result}
        onPrimary={() => {
          if (next) window.location.href = next;
          else setResult(null);
        }}
        primaryLabel={next ? "View transactions" : "Try again"}
      />
    </div>
  );
}
