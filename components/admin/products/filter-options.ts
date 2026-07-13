import type { StatusFilterOption } from "./types";

// Status filter shown as a segmented control on the list toolbar.
export const STATUS_FILTERS: StatusFilterOption[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
