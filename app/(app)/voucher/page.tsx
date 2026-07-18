import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getVoucherData } from "@/lib/vouchers";
import { VoucherView } from "@/components/app/voucher-view";

export const metadata: Metadata = { title: "Voucher" };

// Generate and redeem vouchers. Flag-gated: when voucher is off, bounce to the dashboard. Both
// actions run in modals on this page; the table refreshes via router.refresh() (no full reload).
export default async function VoucherPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("voucher"))) redirect("/dashboard");

  const { wallets, vouchers, baseCode } = await getVoucherData(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 lg:px-0 lg:pb-0">
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
              Vouchers
            </h1>
            <p className="truncate text-sm text-slate-500">
              Generate a voucher or redeem a code.
            </p>
          </div>
        </div>

        <VoucherView
          wallets={wallets}
          vouchers={vouchers}
          baseCode={baseCode}
        />
      </div>
    </div>
  );
}
