import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { NotificationsFeed } from "@/components/admin/notifications/notifications-feed";
import { FEED_PAGE_SIZE, getAdminNotifications } from "@/lib/admin/notifications";
import { getAdminSession } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "All Notifications" };

export default async function AdminNotificationsPage() {
  const session = await getAdminSession();
  const initial = session
    ? await getAdminNotifications({ adminId: session.user.id })
    : {
        rows: [],
        total: 0,
        page: 1,
        pageSize: FEED_PAGE_SIZE,
        totalPages: 1,
        unreadCount: 0,
      };

  return (
    <AdminSection
      title="All Notifications"
      description="System alerts for KYC submissions, deposit and withdrawal requests."
    >
      <NotificationsFeed initial={initial} />
    </AdminSection>
  );
}
