import { Badge } from "@/components/ui/badge";
import type { WithdrawStatus } from "./types";

// Method status + charge label are identical to deposits — reuse them.
export {
  MethodStatusBadge,
  chargeLabel,
} from "@/components/admin/deposits/deposit-badges";

const STATUS_STYLES: Record<WithdrawStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className:
      "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "COMPLETED",
    className:
      "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  canceled: {
    label: "CANCELED",
    className:
      "border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
  failed: {
    label: "FAILED",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function WithdrawStatusBadge({ status }: { status: WithdrawStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}
