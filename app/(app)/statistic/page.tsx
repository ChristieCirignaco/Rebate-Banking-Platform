import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getStatisticData } from "@/lib/statistic";
import { StatisticView } from "@/components/app/statistic/statistic-view";

export const metadata: Metadata = { title: "Statistic" };

// Charts over the user's own ledger. The query stays here on the server and returns every
// range for every wallet currency already bucketed and formatted; the client view only chooses
// which slice to draw, so changing the range or currency costs no round-trip.
export default async function StatisticPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Hiding the nav entry isn't enough — the URL is still typeable.
  if (!(await isFeatureEnabled("statistic"))) redirect("/dashboard");

  const data = await getStatisticData(session.user.id);

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
              Statistic
            </h1>
            <p className="truncate text-sm text-slate-500">
              How your money moved over time.
            </p>
          </div>
        </div>

        <StatisticView data={data} />
      </div>
    </div>
  );
}
