import { prisma } from "@/lib/db";

// A regular user awaiting manual approval (status = "pending"). `emailVerified` splits the
// queue into "ready to approve" (true) and "awaiting email verification" (false).
export type PendingApprovalUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  country?: string;
  phone?: string;
  joinedAt: string;
};

export type PendingApprovals = {
  users: PendingApprovalUser[];
  readyCount: number; // email-verified, actionable now
  awaitingCount: number; // still waiting on the user's email verification
};

// All regular users (role "user" or null — never admin-tier) whose account is still pending,
// newest first. Verified accounts sort ahead so the actionable queue is at the top.
export async function getPendingApprovals(): Promise<PendingApprovals> {
  const users = await prisma.user.findMany({
    where: { status: "pending", OR: [{ role: "user" }, { role: null }] },
    orderBy: [{ emailVerified: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      country: true,
      phone: true,
      createdAt: true,
    },
  });

  const mapped: PendingApprovalUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    country: u.country ?? undefined,
    phone: u.phone ?? undefined,
    joinedAt: u.createdAt.toISOString(),
  }));

  return {
    users: mapped,
    readyCount: mapped.filter((u) => u.emailVerified).length,
    awaitingCount: mapped.filter((u) => !u.emailVerified).length,
  };
}
