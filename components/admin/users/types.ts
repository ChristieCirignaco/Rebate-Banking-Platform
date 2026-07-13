// Data shapes for the users list. Keep components driven by these so the mock data
// in mock-data.ts can be swapped for real API/DB data later.

export type UserRole = "user" | "admin" | "superadmin";
export type AccountStatus = "active" | "suspended" | "pending";
export type EmailStatus = "verified" | "unverified";
export type KycStatus = "approved" | "pending" | "not_submitted" | "rejected";
export type OnlineStatus = "online" | "offline";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: UserRole;
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
  role: "all" | UserRole;
  accountStatus: "all" | AccountStatus;
  kyc: "all" | KycStatus;
  email: "all" | EmailStatus;
}

export interface SelectOption {
  value: string;
  label: string;
}
