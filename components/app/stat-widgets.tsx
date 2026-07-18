import Link from "next/link";
import { ArrowDownUp, ArrowUpFromLine, Package } from "lucide-react";

import { cn } from "@/lib/utils";

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

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/20 text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

// The two half-width cards (Products, Withdrawals) share one trick on mobile: the icon is lifted
// out of the flow into the corner alongside the Blob, so the card is only as tall as its number
// and label instead of stacking icon → number → label. On desktop the chip goes back to static
// and leads the stack as before.
//
// CHIP_CORNER pairs with CORNER_INSET: the chip overlaps the content box, so its slot has to be
// reserved with padding or a long value (the withdrawals amount is a full currency string) slides
// underneath it — `truncate` would happily run the text right under the icon.
const CHIP_CORNER = "absolute top-0 right-0 lg:static";
const CORNER_INSET = "relative pr-11 lg:pr-0";

// The dashboard "Overview" widgets that replace the wallet cards: Products and Withdrawals
// side-by-side, Transfers full-width below. Vibrant gradient cards keep the mockup's card
// aesthetic while surfacing this app's real stats.
export function StatWidgets({ products, withdrawals, transfers }: StatWidgetsData) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/products"
          className="relative flex flex-col overflow-hidden rounded-2xl p-4 text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ background: GRADIENTS.products }}
        >
          <Blob />
          <div className={CORNER_INSET}>
            <Chip className={CHIP_CORNER}>
              <Package className="size-5" />
            </Chip>
            <p className="text-2xl font-bold tabular-nums lg:mt-3">{products.total}</p>
            <p className="text-xs font-medium text-white/80">Products</p>
            {/* Desktop only. These two cards sit side by side in a 2-col grid, so on a phone the
                breakdown lines are the first thing to crowd them — the headline number and label
                carry the card. Hidden at the lg boundary because that's where the dashboard
                itself splits (mobile-home is lg:hidden, desktop-home is hidden lg:block), so
                this matches the layout it lives in rather than inventing a second breakpoint.
                Keep this in step with the Withdrawals subline below: they're a matched pair, and
                hiding one alone leaves the cards visibly uneven. */}
            <p className="mt-1 hidden text-[11px] text-white/70 lg:block">
              {products.approved} approved · {products.pending} pending
            </p>
          </div>
        </Link>

        <div
          className="relative flex flex-col overflow-hidden rounded-2xl p-4 text-white shadow-lg"
          style={{ background: GRADIENTS.withdrawals }}
        >
          <Blob />
          <div className={CORNER_INSET}>
            <Chip className={CHIP_CORNER}>
              <ArrowUpFromLine className="size-5" />
            </Chip>
            <p className="truncate text-2xl font-bold tabular-nums lg:mt-3">
              {withdrawals.amountLabel}
            </p>
            <p className="text-xs font-medium text-white/80">Withdrawals</p>
            {/* Desktop only — the pair of the Products subline above; see the note there. */}
            <p className="mt-1 hidden text-[11px] text-white/70 lg:block">
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
