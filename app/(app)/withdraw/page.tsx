import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getWithdrawData } from "@/lib/withdrawals";
import { WithdrawView } from "@/components/app/withdraw/withdraw-view";

export const metadata: Metadata = { title: "Withdrawals" };

// Withdraw to a saved account (bank or crypto, from an admin-configured method). Flag-gated:
// when withdrawals are off, bounce to the dashboard. The per-user gate (withdraw control, the
// admin's withdrawalStatus/message, KYC) is NOT resolved here: it is checked when the user
// submits the form, so a paused account still fills it in normally and receives the admin's
// message as a dialog at that point rather than a banner on arrival.
export default async function WithdrawPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("withdrawals"))) redirect("/dashboard");

  const data = await getWithdrawData(session.user.id);

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
              Withdraw money
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Send your balance to a bank or crypto address.
            </p>
          </div>
        </div>

        <WithdrawView data={data} />
      </div>
    </div>
  );
}
