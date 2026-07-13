import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "./types";

const STATUS_STYLES: Record<ProductStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className:
      "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  approved: {
    label: "APPROVED",
    className:
      "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  rejected: {
    label: "REJECTED",
    className:
      "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}
