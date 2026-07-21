import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { X } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { formatCurrency } from "@/lib/format";
import {
  TRANSFER_AUTH_COOKIE,
  decodeTransferAuth,
  nextStep,
  type TransferStep,
} from "@/lib/transfer-auth";
import { VerifyStepForm } from "@/components/app/verify-step-form";

export const metadata: Metadata = { title: "Authorize transfer" };

const STEPS: TransferStep[] = ["imf", "tax", "cot", "otp"];

// A single authorization step. The order is enforced HERE, server-side: we read the signed
// session, compute the next uncleared step, and redirect if the URL doesn't match it — so a
// user can't jump to /send/verify/tax before /imf is verified, or deep-link past a step.
export default async function VerifyStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // /send is gated but this continuation step wasn't, so an in-flight authorization stayed
  // reachable after transfers were switched off. Hiding the entry point isn't enough — the URL
  // is typeable, and the cookie survives the flag change.
  if (!(await isFeatureEnabled("send_money"))) redirect("/dashboard");

  const { step } = await params;
  if (!STEPS.includes(step as TransferStep)) redirect("/send");

  const store = await cookies();
  const state = decodeTransferAuth(store.get(TRANSFER_AUTH_COOKIE)?.value);
  if (!state) redirect("/send");

  const expected = nextStep(state);
  if (!expected) redirect("/send");
  if (expected !== step) redirect(`/send/verify/${expected}`);

  const stepTotal = state.sequence.length;
  const stepIndex = state.sequence.indexOf(expected) + 1;
  const amountLabel = formatCurrency(Number(state.payload.amount), state.payload.currency);

  return (
    <div className="mx-auto max-w-md px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center justify-end py-2 lg:pt-0">
          <Link
            href="/send"
            aria-label="Cancel"
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <X className="size-4" />
          </Link>
        </div>
        <VerifyStepForm
          step={expected}
          stepIndex={stepIndex}
          stepTotal={stepTotal}
          amountLabel={amountLabel}
          recipientLabel={state.payload.recipientLabel}
        />
      </div>
    </div>
  );
}
