// Shared types for the admin-account management page (/admin/users/admin). Separate
// from components/admin/users/types.ts — that page manages regular users only.

export type AdminRole = "admin" | "super_admin";
export type AdminAccountStatus = "active" | "suspended" | "pending";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: AdminRole;
  status: AdminAccountStatus;
  phone?: string;
  gender?: string;
  address?: string;
  birthday?: string; // ISO date
  joinedAt: string; // ISO
  lastLogin?: string; // ISO
}

// Non-sensitive fields, editable for every admin-tier account. phone/address/birthday
// are always sent (possibly "") — an empty string means "clear this field", matching
// updateAdminInfo's server-side handling; omitting them entirely is not supported by
// this form. Email/password are handled separately and only accepted server-side when
// the target is NOT super_admin — enforced regardless of what the client sends.
export interface AdminEditPayload {
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  address: string;
  birthday: string; // yyyy-mm-dd, or "" to clear
  email?: string;
  newPassword?: string;
}
