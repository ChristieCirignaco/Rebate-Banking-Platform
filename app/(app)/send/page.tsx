import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import {
  getEnabledFlags,
  isFeatureEnabled,
} from "@/lib/settings/feature-flags";
import { enabledTransferKinds } from "@/components/app/app-nav";
import { SendForm } from "@/components/app/send-form";

export const metadata: Metadata = { title: "Send money" };

// Create a transfer (internal / domestic / wire). Flag-gated: when send_money is off, bounce
// to the dashboard. The form debits the sender's default-currency wallet on submit.
export default async function SendPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("send_money"))) redirect("/dashboard");
  // Each transfer type is separately switchable; with every one off there is no form to show,
  // so treat it the same as Send Money being off rather than rendering an empty tab strip.
  const kinds = enabledTransferKinds(await getEnabledFlags());
  if (kinds.length === 0) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  });
  const currency = user?.currency ?? "USD";
  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId: session.user.id, currency } },
    select: { balanceMinor: true },
  });
  const balanceLabel = formatCurrency(
    toMajor(wallet?.balanceMinor ?? 0n),
    currency,
  );

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/dashboard"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Send money
            </h1>
            <p className="truncate text-sm text-slate-500">
              Transfer to a user, a domestic bank, or by wire.
            </p>
          </div>
        </div>
        <SendForm
          balanceLabel={balanceLabel}
          currency={currency}
          kinds={kinds}
        />
      </div>
    </div>
  );
}
