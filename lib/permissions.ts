import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

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

// Admins get every app capability plus Better Auth's built-in admin powers.
const admin = ac.newRole({
  claims: ["review", "reverse"],
  withdrawals: ["process"],
  wallet: ["adjust"],
  payments: ["configure"],
  flags: ["manage"],
  members: ["manage"],
  kyc: ["manage"],
  ...adminAc.statements,
});

export const roles = { user, admin };
