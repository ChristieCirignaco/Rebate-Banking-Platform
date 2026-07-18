import type { Prisma } from "@prisma/client";

// Canonical "regular user" scope: excludes admin-tier accounts (admin, super_admin) so an admin
// is never counted or listed as a user. Uses an allowlist (role "user" or NULL) rather than
// notIn(admin roles) because Prisma's `notIn` silently drops NULL rows under SQL's three-valued
// logic. This is the single source of truth shared by the users list, pending approvals, and the
// dashboard "Total Users" stat, so the count can never drift from the list it links to.
export const REGULAR_USER_WHERE: Prisma.UserWhereInput = {
  OR: [{ role: "user" }, { role: null }],
};
