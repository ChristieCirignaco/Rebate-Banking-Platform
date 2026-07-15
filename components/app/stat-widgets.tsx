import { ArrowDownUp, ArrowUpFromLine, Package } from "lucide-react";

export type StatWidgetsData = {
  products: { total: number; approved: number; pending: number };
  withdrawals: { amountLabel: string; pending: number; total: number };
  transfers: { amountLabel: string; count: number; inCount: number; outCount: number };
};

const GRADIENTS = {
  products: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
  withdrawals: "linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)",
  transfers: "linear-gradient(135deg,#2563eb 0%,#06b6d4 100%)",
} as const;

// A soft light blob in the corner — the subtle card "texture" seen on the mockup cards.
function Blob() {
  return (
    <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-white/10" />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white">
      {children}
    </span>
  );
}

// The dashboard "Overview" widgets that replace the wallet cards: Products and Withdrawals
// side-by-side, Transfers full-width below. Vibrant gradient cards keep the mockup's card
// aesthetic while surfacing this app's real stats.
export function StatWidgets({ products, withdrawals, transfers }: StatWidgetsData) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="relative flex flex-col overflow-hidden rounded-2xl p-4 text-white shadow-lg"
          style={{ background: GRADIENTS.products }}
        >
          <Blob />
          <div className="relative">
            <Chip>
              <Package className="size-5" />
            </Chip>
            <p className="mt-3 text-2xl font-bold tabular-nums">{products.total}</p>
            <p className="text-xs font-medium text-white/80">Products</p>
            <p className="mt-1 text-[11px] text-white/70">
              {products.approved} approved · {products.pending} pending
            </p>
          </div>
        </div>

        <div
          className="relative flex flex-col overflow-hidden rounded-2xl p-4 text-white shadow-lg"
          style={{ background: GRADIENTS.withdrawals }}
        >
          <Blob />
          <div className="relative">
            <Chip>
              <ArrowUpFromLine className="size-5" />
            </Chip>
            <p className="mt-3 truncate text-2xl font-bold tabular-nums">{withdrawals.amountLabel}</p>
            <p className="text-xs font-medium text-white/80">Withdrawals</p>
            <p className="mt-1 text-[11px] text-white/70">
              {withdrawals.pending} pending · {withdrawals.total} total
            </p>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg"
        style={{ background: GRADIENTS.transfers }}
      >
        <Blob />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Chip>
              <ArrowDownUp className="size-5" />
            </Chip>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/80">Transfers</p>
              <p className="truncate text-2xl font-bold tabular-nums">{transfers.amountLabel}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold">{transfers.count} total</p>
            <p className="text-[11px] text-white/70">
              In {transfers.inCount} · Out {transfers.outCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
