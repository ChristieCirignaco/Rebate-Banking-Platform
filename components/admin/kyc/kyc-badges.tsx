import { Badge } from "@/components/ui/badge";
import type { KycSubmissionStatus } from "./types";

// Template active/inactive is identical to deposits/withdrawals — reuse it.
export { MethodStatusBadge } from "@/components/admin/deposits/deposit-badges";

const STATUS_STYLES: Record<KycSubmissionStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className: "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  approved: {
    label: "APPROVED",
    className: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  rejected: {
    label: "REJECTED",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function KycStatusBadge({ status }: { status: KycSubmissionStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}

// Applicable-to is always "User" in this project (merchants unsupported).
export function ApplicableToBadge() {
  return <Badge variant="secondary">User</Badge>;
}
