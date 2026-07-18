import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getExchangeData } from "@/lib/exchange";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { ExchangeForm } from "@/components/app/exchange-form";

export const metadata: Metadata = { title: "Exchange Money" };

// Convert between the user's own wallets. Flag-gated: when exchange is off, bounce to the
// dashboard. Rates come from the admin-configured Currency table; settlement is instant.
export default async function ExchangePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("exchange"))) redirect("/dashboard");

  const { wallets, history, hasPin } = await getExchangeData(session.user.id);

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
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Exchange money
            </h1>
            <p className="text-sm text-slate-500">
              Convert instantly between your wallets.
            </p>
          </div>
        </div>

        <ExchangeForm wallets={wallets} hasPin={hasPin} />

        {history.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent exchanges
            </h2>
            <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {history.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {e.fromLabel}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-slate-400" />
                    <span className="text-sm font-semibold text-emerald-600">
                      {e.toLabel}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">{e.rateLabel}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {e.createdAtLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
