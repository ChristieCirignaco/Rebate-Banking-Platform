import type { Metadata } from "next";

import { RecentUsersTable } from "@/components/admin/recent-users-table";
import { SectionCards } from "@/components/admin/section-cards";
import { SignupsChart } from "@/components/admin/signups-chart";
import { getDashboardMetrics, getRecentUsers, getSignupSeries } from "@/lib/admin/metrics";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [metrics, signups, recentUsers] = await Promise.all([
    getDashboardMetrics(),
    getSignupSeries(90),
    getRecentUsers(8),
  ]);

  return (
    <>
      <SectionCards metrics={metrics} />
      <div className="px-4 lg:px-6">
        <SignupsChart data={signups} />
      </div>
      <RecentUsersTable users={recentUsers} />
    </>
  );
}
