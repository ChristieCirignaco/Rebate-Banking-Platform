import type { DepositStatus } from "./types";

export const DEPOSIT_STATUS_OPTIONS: { value: DepositStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "failed", label: "Failed" },
];
