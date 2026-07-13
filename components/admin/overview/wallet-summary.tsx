import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletSummaryItem } from "./types";

const TINTS = [
  {
    bg: "bg-emerald-500/5",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    bg: "bg-blue-500/5",
    chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    bg: "bg-violet-500/5",
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    bg: "bg-amber-500/5",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

function WalletCard({
  wallet,
  tintIndex,
}: {
  wallet: WalletSummaryItem;
  tintIndex: number;
}) {
  const tint = TINTS[tintIndex % TINTS.length];
  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border p-3", tint.bg)}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          tint.chip,
        )}
      >
        {wallet.currency}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{wallet.name}</div>
        <div className="text-muted-foreground text-xs">
          {formatNumber(wallet.walletCount)}{" "}
          {wallet.walletCount === 1 ? "wallet" : "wallets"}
        </div>
      </div>
      <div className="text-right text-sm font-semibold tabular-nums">
        {formatCurrency(wallet.balance, wallet.currency)}
      </div>
    </div>
  );
}

export function WalletSummary({ wallets }: { wallets: WalletSummaryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Summary</CardTitle>
        <CardAction>
          <Badge variant="secondary">{wallets.length} Currency Types</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {wallets.map((wallet, index) => (
            <WalletCard
              key={wallet.currency}
              wallet={wallet}
              tintIndex={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
