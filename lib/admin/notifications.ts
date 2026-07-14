import { prisma } from "@/lib/db";
import {
  SYSTEM_ALERT_TYPES,
  type AdminNotificationsResult,
} from "@/components/admin/notifications/types";

export const FEED_PAGE_SIZE = 10;

// System-alert type values as a plain string[] for Prisma `in` filters.
const ALERT_TYPES = [...SYSTEM_ALERT_TYPES];

export interface AdminNotificationsParams {
  adminId: string;
  page?: number;
  pageSize?: number;
}

// The admin "All Notifications" feed: the signed-in admin's own system-alert rows on the
// shared `notifications` table, newest first, server-paginated. Unread = readAt IS NULL.
export async function getAdminNotifications(
  params: AdminNotificationsParams,
): Promise<AdminNotificationsResult> {
  const rawPageSize = params.pageSize ?? FEED_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), 100)
      : FEED_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);

  const where = { userId: params.adminId, type: { in: ALERT_TYPES } };

  const [total, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    rows: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
    unreadCount,
  };
}

// Size of the "All Users" broadcast audience — every non-admin account. Shown on the
// composer so the admin knows the blast radius before sending. Mirrors the broadcast's
// recipient filter exactly (null role counts as a user), so the count can't drift from it.
export async function getBroadcastAudienceSize(): Promise<number> {
  return prisma.user.count({
    where: { OR: [{ role: { not: "admin" } }, { role: null }] },
  });
}
