import { prisma } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/auth-guards";
import type { AdminAccount, AdminAccountStatus, AdminRole } from "@/components/admin/admins/types";

// Admin-tier accounts (admin, super_admin) for /admin/users/admin. Separated from the
// regular users list (lib/admin/users-list.ts), which now excludes these roles.
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const rows = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] } },
    // Alphabetical role ("admin" before "super_admin"), newest-first within each tier.
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.image ?? undefined,
    role: row.role as AdminRole,
    status: row.status as AdminAccountStatus,
    phone: row.phone ?? undefined,
    gender: row.gender ?? undefined,
    address: row.address ?? undefined,
    birthday: row.birthday?.toISOString(),
    joinedAt: row.createdAt.toISOString(),
    lastLogin: row.lastLoginAt?.toISOString(),
  }));
}
