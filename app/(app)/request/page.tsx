import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getRequestPageData, type RequestStatus } from "@/lib/requests";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { cn } from "@/lib/utils";
import { RequestForm } from "@/components/app/request-form";

export const metadata: Metadata = { title: "Request Money" };

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

// Request the platform to credit your wallet. Flag-gated: when request_money is off, bounce to
// the dashboard. Creating a request moves no money — an admin reviews and approves the credit.
export default async function RequestPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("request_money"))) redirect("/dashboard");

  const { wallets, requests } = await getRequestPageData(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/dashboard"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Request money
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Ask an admin to credit your wallet.
            </p>
          </div>
        </div>

        <RequestForm wallets={wallets} />

        {requests.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Your requests
            </h2>
            <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {r.amountLabel}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {r.reason?.trim() || "No reason given"}
                    </p>
                    {r.remarks?.trim() ? (
                      <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                        Admin: {r.remarks}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                      {r.txnId} · {r.createdAtLabel}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                      STATUS_STYLE[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
