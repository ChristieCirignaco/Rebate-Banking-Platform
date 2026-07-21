import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getReferralData } from "@/lib/referrals";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { ReferralView } from "@/components/app/referral-view";

export const metadata: Metadata = { title: "Referrals" };

// Invite friends via a share link and track referrals + earnings. Flag-gated: when referrals
// are off, bounce to the dashboard. Same inner-page shell as the other feature pages.
export default async function ReferralsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("referrals"))) redirect("/dashboard");

  const data = await getReferralData(session.user.id);

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
              Referrals
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Invite friends and earn rewards.
            </p>
          </div>
        </div>

        <ReferralView data={data} />
      </div>
    </div>
  );
}
