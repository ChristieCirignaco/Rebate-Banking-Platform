import type { SelectOption } from "./types";

// Static UI config for the users filter dropdowns (not mock data).

export const ACCOUNT_STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

export const KYC_OPTIONS: SelectOption[] = [
  { value: "all", label: "All KYC" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "not_submitted", label: "Not submitted" },
  { value: "rejected", label: "Rejected" },
];

export const EMAIL_OPTIONS: SelectOption[] = [
  { value: "all", label: "All emails" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
];
