import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getKycData } from "@/lib/kyc";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { KycView } from "@/components/app/kyc/kyc-view";

export const metadata: Metadata = { title: "Identity Verification" };

// Submit identity documents against the admin-configured KYC template. Flag-gated: when
// kyc_submission is off, bounce to the dashboard. The view is status-aware — approved/pending
// users see a panel instead of the form; a rejected user sees the admin remarks and can resubmit.
export default async function KycPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("kyc_submission"))) redirect("/dashboard");

  const data = await getKycData(session.user.id);

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
              Identity verification
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Verify your identity to unlock your account.
            </p>
          </div>
        </div>

        <KycView data={data} />
      </div>
    </div>
  );
}
