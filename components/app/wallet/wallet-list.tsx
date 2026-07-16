import Link from "next/link";
import { Wallet } from "lucide-react";

import type { WalletActivityView, WalletCardView, WalletPageData } from "@/lib/wallet-page";
import { cn } from "@/lib/utils";
import { TXN_ICONS } from "@/components/app/transaction-row";

// The /wallet screen body. Purely presentational and fully server-rendered — nothing here is
// interactive, so it stays out of the client bundle. Every money string arrives preformatted
// from lib/wallet-page.ts; this file never does arithmetic.

export function WalletList({ data }: { data: WalletPageData }) {
  if (data.wallets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <Wallet className="size-6 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No wallets yet</p>
        <p className="text-xs text-slate-400">
          Your currency wallets will appear here once one is issued.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <BalanceSummary data={data} />
      {data.wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </div>
  );
}

// Per-wallet balances, plus a converted total when — and only when — every wallet currency has
// an active rate (lib/wallet-page.ts returns null otherwise, and the total row disappears).
function BalanceSummary({ data }: { data: WalletPageData }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
      {data.wallets.map((wallet) => (
        <div key={wallet.id} className="flex justify-between text-slate-500">
          <span>{wallet.currency} Wallet</span>
          <span>{wallet.balanceLabel}</span>
        </div>
      ))}
      {data.total ? (
        <>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
            <span>Total in {data.total.currency}</span>
            <span>{data.total.amountLabel}</span>
          </div>
          {data.wallets.length > 1 ? (
            <p className="text-xs text-slate-400">
              Balances outside {data.total.currency} are converted at the current rate.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function WalletCard({ wallet }: { wallet: WalletCardView }) {
  return (
    <section className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex items-center gap-3 p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{wallet.currency}</p>
            {wallet.isDefault ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
                Default
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-500">{wallet.name}</p>
        </div>
        <p className="shrink-0 text-base font-bold text-slate-900">{wallet.balanceLabel}</p>
      </div>

      {wallet.activity.length > 0 ? (
        wallet.activity.map((row) => <ActivityRow key={row.id} row={row} />)
      ) : (
        <p className="p-3.5 text-center text-xs text-slate-400">No activity on this wallet yet.</p>
      )}

      <Link
        href="/transactions"
        className="p-3 text-center text-sm font-semibold text-blue-600 transition-colors hover:bg-slate-50"
      >
        View all
      </Link>
    </section>
  );
}

function ActivityRow({ row }: { row: WalletActivityView }) {
  const Icon = TXN_ICONS[row.iconKey];
  return (
    <div className="flex items-center gap-3 p-3.5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          row.positive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{row.title}</p>
        <p className="truncate text-xs text-slate-400">
          {row.dateLabel}
          {row.pending ? " · Pending" : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          row.positive ? "text-emerald-600" : "text-slate-900",
        )}
      >
        {row.amountLabel}
      </span>
    </div>
  );
}
