import type { BalanceDelta } from "@/lib/dashboard/transactions";
import { BalanceHero } from "@/components/app/balance-hero";
import { QuickActions } from "@/components/app/quick-actions";

const CARD_GRADIENT = "linear-gradient(150deg,#2748a0 0%,#1a2f66 50%,#0f1a38 100%)";

// The desktop balance card: the same navy gradient + hero + actions as the mobile hero, but
// framed as a rounded card (the greeting/search move to the top bar on desktop).
export function BalanceCard({
  balanceLabel,
  delta,
}: {
  balanceLabel: string;
  delta: BalanceDelta | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
      style={{ background: CARD_GRADIENT }}
    >
      <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/5" />
      <div className="relative">
        <BalanceHero balanceLabel={balanceLabel} delta={delta} />
        <QuickActions />
      </div>
    </div>
  );
}
