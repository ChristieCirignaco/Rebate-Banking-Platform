import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getWalletPageData } from "@/lib/wallet-page";
import { addableCurrencies, MAX_WALLETS } from "@/lib/wallets";
import { AddWalletDialog } from "@/components/app/wallet/add-wallet-dialog";
import { WalletList } from "@/components/app/wallet/wallet-list";

export const metadata: Metadata = { title: "Wallets" };

// The user's currency wallets: a grid of cards, one per wallet, each showing its balance and a
// Manage dialog (make primary / remove / jump to deposit, withdraw or transactions). Deposits,
// withdrawals and exchanges each have their own screen, and history lives on /transactions, so
// everything but the dialogs renders on the server.
export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Hiding the nav entry isn't enough — the URL is still typeable.
  if (!(await isFeatureEnabled("wallets"))) redirect("/dashboard");

  const [data, addable] = await Promise.all([
    getWalletPageData(session.user.id),
    addableCurrencies(session.user.id),
  ]);
  const remaining = Math.max(0, MAX_WALLETS - data.wallets.length);

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Wallets</h1>
            <p className="text-sm text-slate-500">Your currency wallets and balances.</p>
          </div>
          <AddWalletDialog currencies={addable} remaining={remaining} />
        </div>

        <WalletList data={data} />
      </div>
    </div>
  );
}
