import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// Resource -> actions the app cares about, on top of Better Auth's built-in
// user/session admin resources. Mirrors the capability list in design spec §3.
export const statement = {
  ...defaultStatements,
  claims: ["review", "reverse"],
  withdrawals: ["process"],
  wallet: ["adjust"],
  payments: ["configure"],
  flags: ["manage"],
  members: ["manage"],
  kyc: ["manage"],
} as const;

export const ac = createAccessControl(statement);

// Regular users hold no admin capabilities.
const user = ac.newRole({});

// Admins get every app capability, but deliberately NOT Better Auth's full built-in
// admin-plugin power set (adminAc.statements includes user:set-role/ban/delete/set-email —
// granting those to "admin" would let any regular admin call /api/auth/admin/set-role directly
// and self-promote to super_admin, bypassing every app-level guard). Granted here:
//   - `user:create` — the "Add New User" flow (app/admin/users/actions.ts createUser). Better
//     Auth's create-user endpoint additionally requires `set-role` whenever a `role` key is
//     present at all, so that action omits `role` for the plain-user case and only sends
//     `role: "admin"` when the caller is already super_admin.
//   - `user:impersonate` — the "Login as User" flow (support impersonation). Safe to grant to
//     every admin: unlike set-role it can't self-promote, and Better Auth's impersonate endpoint
//     refuses to impersonate an admin-tier target unless `impersonate-admins` is ALSO held (it
//     isn't, at any tier), so this only ever grants access to a regular user's own session.
const admin = ac.newRole({
  claims: ["review", "reverse"],
  withdrawals: ["process"],
  wallet: ["adjust"],
  payments: ["configure"],
  flags: ["manage"],
  members: ["manage"],
  kyc: ["manage"],
  user: ["create", "impersonate"],
});

// Super admin: same app capabilities as admin, plus the narrow additional Better Auth
// power this app actually uses at the super-admin tier: `set-role` (createUser explicitly
// passes role:"admin" when minting a new admin account, which Better Auth treats as a
// role change requiring this permission — see app/admin/users/actions.ts) and
// `set-password` (updateAdminInfo resetting a regular admin's password). Both call sites
// are already gated to super_admin at the app layer; granting them here is what lets
// those specific, already-authorized calls succeed against Better Auth's own checks.
// Shares the admin tier's `impersonate` (Login as User). Still deliberately excludes
// ban/delete/set-email and `impersonate-admins` — nothing in this app calls them, so there's
// no reason for even the top tier to hold them (and withholding impersonate-admins is what
// keeps impersonation scoped to regular users only).
const superAdmin = ac.newRole({
  claims: ["review", "reverse"],
  withdrawals: ["process"],
  wallet: ["adjust"],
  payments: ["configure"],
  flags: ["manage"],
  members: ["manage"],
  kyc: ["manage"],
  user: ["create", "set-role", "set-password", "impersonate"],
});

export const roles = { user, admin, super_admin: superAdmin };
