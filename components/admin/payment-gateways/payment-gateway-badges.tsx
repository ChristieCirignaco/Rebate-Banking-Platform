import { Badge } from "@/components/ui/badge";
import type { GatewayStatus } from "./types";

export function WithdrawBadge({ available }: { available: boolean }) {
  return available ? (
    <Badge className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
      YES
    </Badge>
  ) : (
    <Badge className="border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300">
      NO
    </Badge>
  );
}

export function GatewayStatusBadge({ status }: { status: GatewayStatus }) {
  return status === "active" ? (
    <Badge className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
      ACTIVE
    </Badge>
  ) : (
    <Badge className="border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400">
      INACTIVE
    </Badge>
  );
}
