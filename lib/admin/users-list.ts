import { prisma } from "@/lib/db";
import type {
  AccountStatus,
  AdminUser,
  EmailStatus,
  KycStatus,
  UserRole,
} from "@/components/admin/users/types";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

// Real users for the list page, mapped to the view shape.
export async function getAdminUsers(): Promise<AdminUser[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const now = Date.now();

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username ?? user.email.split("@")[0],
    role: (user.role ?? "user") as UserRole,
    accountStatus: (user.status as AccountStatus) ?? "active",
    email: user.email,
    emailStatus: (user.emailVerified
      ? "verified"
      : "unverified") as EmailStatus,
    kycDocument: user.kycDocumentType ?? undefined,
    kycStatus: (user.kycStatus as KycStatus) ?? "not_submitted",
    joinedAt: user.createdAt.toISOString(),
    codeUsed: user.activationCode ?? undefined,
    lastLogin: user.lastLoginAt?.toISOString(),
    onlineStatus:
      user.lastLoginAt && now - user.lastLoginAt.getTime() < ONLINE_WINDOW_MS
        ? "online"
        : "offline",
  }));
}
