import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getDepositData } from "@/lib/deposits";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { DepositForm } from "@/components/app/deposit-form";
import { ChatButton } from "@/components/app/chat/chat-button";

export const metadata: Metadata = { title: "Deposit Money" };

// Fund a wallet. Flag-gated: when deposits are off, bounce to the dashboard. Methods are bound
// to a currency, so the form only offers the ones matching the chosen wallet.
export default async function DepositPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("deposits"))) redirect("/dashboard");

  const { wallets, methods, hasPin } = await getDepositData(session.user.id);

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
              Deposit money
            </h1>
            <p className="text-sm text-slate-500">
              Fund your wallet via a payment provider.
            </p>
          </div>
          {/* Chat is in the desktop header already; surface it here on mobile only. */}
          <span className="lg:hidden">
            <ChatButton variant="muted" />
          </span>
        </div>
        <DepositForm wallets={wallets} methods={methods} hasPin={hasPin} />
      </div>
    </div>
  );
}
