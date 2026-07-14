// Data shapes for the users list. Components are driven by these; live data is mapped
// into them in lib/admin/users-list.ts.

export type AccountStatus = "active" | "suspended" | "pending";
export type EmailStatus = "verified" | "unverified";
export type KycStatus = "approved" | "pending" | "not_submitted" | "rejected";
export type OnlineStatus = "online" | "offline";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  accountStatus: AccountStatus;
  email: string;
  emailStatus: EmailStatus;
  kycDocument?: string; // e.g. "Passport"
  kycStatus: KycStatus;
  joinedAt: string; // ISO
  codeUsed?: string; // activation code
  lastLogin?: string; // ISO
  onlineStatus: OnlineStatus;
}

export interface UserFilters {
  accountStatus: "all" | AccountStatus;
  kyc: "all" | KycStatus;
  email: "all" | EmailStatus;
}

export interface SelectOption {
  value: string;
  label: string;
}
