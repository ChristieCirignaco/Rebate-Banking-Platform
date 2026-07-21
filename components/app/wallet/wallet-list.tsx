import { Wallet } from "lucide-react";

import type { WalletCardView, WalletPageData } from "@/lib/wallet-page";
import { ManageWalletDialog } from "@/components/app/wallet/manage-wallet-dialog";

// The /wallet screen body: a grid of wallet cards, one per currency, each with its own Manage
// dialog. Server-rendered except the dialogs; every money string arrives preformatted from
// lib/wallet-page.ts and this file never does arithmetic.
//
// There is no transaction history here by design. Each card used to inline that wallet's last
// five ledger rows plus a "View all" link, which made the page a duplicate of /transactions —
// longer, unfilterable, and unpaged. The wallets are the subject; history is one link away.

export function WalletList({ data }: { data: WalletPageData }) {
  if (data.wallets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
        <Wallet className="size-6 text-slate-300 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No wallets yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Your currency wallets will appear here once one is issued.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* One line, not a breakdown: each card already states its own balance, so repeating them
          all in a summary was the same numbers twice. Present only when every wallet currency has
          an active rate — lib/wallet-page returns null otherwise rather than under-report. */}
      {data.total ? (
        <div className="flex items-baseline justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
          <span className="text-sm text-slate-500 dark:text-slate-400">Total in {data.total.currency}</span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{data.total.amountLabel}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.wallets.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} />
        ))}
      </div>
    </div>
  );
}

function WalletCard({ wallet }: { wallet: WalletCardView }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{wallet.currency}</p>
            {wallet.isDefault ? (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:bg-blue-500/10 dark:text-blue-400">
                Primary
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{wallet.name}</p>
        </div>
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
        {wallet.balanceLabel}
      </p>

      <ManageWalletDialog wallet={wallet} />
    </section>
  );
}
