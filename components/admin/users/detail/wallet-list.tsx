import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { DetailWallet } from "./types";

export function WalletList({ wallets }: { wallets: DetailWallet[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallets</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {wallets.map((wallet) => (
          <div
            key={wallet.currency}
            className="flex items-center gap-3 rounded-lg border p-2.5"
          >
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {wallet.currency}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {wallet.name}
                </span>
                {wallet.isDefault ? (
                  <Badge variant="secondary" className="text-[10px]">
                    DEFAULT
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                No recent activity
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(wallet.balance, wallet.currency)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
