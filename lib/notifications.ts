import { prisma } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/auth-guards";
import { formatDateTime } from "@/lib/format";
import type { SystemAlertType } from "@/components/admin/notifications/types";

// Fan a system alert out to every admin as a Notification row, reusing the existing
// `notifications` table rather than a parallel alerts store. This is the single emit
// primitive real event sources call — e.g. a user-facing deposit-request endpoint would
// call `notifyAdmins({ type: "deposit_requested", ... })` so it surfaces in the admin
// "All Notifications" feed. Returns the number of admins alerted.
export async function notifyAdmins(args: {
  type: SystemAlertType;
  title: string;
  message: string;
}): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] } },
    select: { id: true },
  });
  if (admins.length === 0) return 0;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: args.type,
      title: args.title,
      message: args.message,
    })),
  });
  return admins.length;
}

// ---------------------------------------------------------------------------
// User read layer
// ---------------------------------------------------------------------------

// The `type` column is overloaded across two audiences on one table. These are the
// user-facing notices an admin sends TO a user (`notifyUser` / `broadcastNotification`);
// SYSTEM_ALERT_TYPES rows (kyc_submitted, deposit_requested, withdraw_requested) live on
// the same table but are ADMIN-owned and belong to the admin feed. Every user-facing read
// filters to these two values only — without it a user would be shown admin alert rows.
export const USER_NOTICE_TYPES = ["email", "push"] as const;
export type UserNoticeType = (typeof USER_NOTICE_TYPES)[number];

// A single row of the user's notification list. Serialization-clean (plain strings and a
// boolean, no Date/BigInt/Decimal) so it crosses the RSC boundary into a client component
// as-is. `dateLabel` is preformatted server-side via formatDateTime, which pins to UTC and
// is therefore stable across server render and client hydration.
export interface UserNotificationItem {
  id: string;
  title: string | null;
  message: string;
  dateLabel: string;
  read: boolean;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// The shared filter for everything a user is allowed to see on the notifications table:
// their own rows, user-notice types only, and visible-now only.
//
// On `scheduledAt`: the field was WRITE-ONLY until this read layer existed. Both writers
// (notifyUser and broadcastNotification) persist a future send time from the admin composer,
// but nothing ever dispatched on it — no cron, no queue reads the column. This filter is what
// finally gives the field meaning: a row scheduled for the future stays invisible to the user
// until its time arrives, and `null` means "send immediately" (the un-scheduled default).
// Reused by the mark-read actions so a user can't mark a row they cannot yet see.
export function userNotificationWhere(userId: string) {
  return {
    userId,
    type: { in: [...USER_NOTICE_TYPES] },
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };
}

// The signed-in user's notification list — newest first, capped. Visible-now rows only.
export async function getUserNotifications(
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<UserNotificationItem[]> {
  const take =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), MAX_LIMIT) : DEFAULT_LIMIT;

  const rows = await prisma.notification.findMany({
    where: userNotificationWhere(userId),
    // id tiebreaker keeps the order stable when a broadcast writes many rows in one tick.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, title: true, message: true, createdAt: true, readAt: true },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    dateLabel: formatDateTime(row.createdAt.toISOString()),
    read: row.readAt !== null,
  }));
}

// Unread badge count for the header bell. Same audience + visibility rules as the list, so
// the badge can never promise a row the list won't show. Unread = readAt IS NULL, matching
// how the admin feed reads the same column for its own rows.
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { ...userNotificationWhere(userId), readAt: null },
  });
}
