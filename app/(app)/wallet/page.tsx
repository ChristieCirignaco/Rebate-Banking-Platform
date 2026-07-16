import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getWalletPageData } from "@/lib/wallet-page";
import { WalletList } from "@/components/app/wallet/wallet-list";

export const metadata: Metadata = { title: "Wallets" };

// The user's currency wallets: balance per wallet, which one is the default, and each wallet's
// most recent ledger activity. Read-only — deposits/withdrawals/exchanges each have their own
// screen — so the whole page renders on the server.
export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getWalletPageData(session.user.id);

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Wallets</h1>
            <p className="text-sm text-slate-500">Your balances and recent activity.</p>
          </div>
        </div>

        <WalletList data={data} />
      </div>
    </div>
  );
}
