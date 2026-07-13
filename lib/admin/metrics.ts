import { prisma } from "@/lib/db";

// Real dashboard queries. Metrics whose subsystems don't exist yet (claims,
// withdrawals, KYC, wallets) are added here as those models land — the dashboard
// grows without rework (design spec §16).

export type DashboardMetrics = {
  totalUsers: number;
  adminCount: number;
  verifiedUsers: number;
  activeFlags: number;
  totalFlags: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalUsers, adminCount, verifiedUsers, activeFlags, totalFlags] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.featureFlag.count({ where: { enabled: true } }),
    prisma.featureFlag.count(),
  ]);
  return { totalUsers, adminCount, verifiedUsers, activeFlags, totalFlags };
}

export type SignupPoint = { date: string; count: number };

// Daily signup counts for the last `days` days, with gaps filled so the chart has
// a continuous x-axis. Buckets by UTC day.
export async function getSignupSeries(days: number): Promise<SignupPoint[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (const { createdAt } of users) {
    const key = createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series: SignupPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

export type RecentUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

export async function getRecentUsers(limit: number): Promise<RecentUser[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}
