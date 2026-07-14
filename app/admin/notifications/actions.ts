"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_ROLES, getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getAdminNotifications, FEED_PAGE_SIZE } from "@/lib/admin/notifications";
import {
  SYSTEM_ALERT_TYPES,
  type AdminNotificationsResult,
  type BroadcastResult,
} from "@/components/admin/notifications/types";
import type { NotifyPayload } from "@/components/admin/users/detail/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Typed as the failure branch alone so it satisfies both ActionResult and BroadcastResult.
const NOT_AUTHORIZED = { ok: false as const, error: "Not authorized." };

// Insert notification rows in chunks so a large audience doesn't build one giant query.
const FANOUT_CHUNK = 500;

const ALERT_TYPES = [...SYSTEM_ALERT_TYPES];

const EMPTY_FEED: AdminNotificationsResult = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: FEED_PAGE_SIZE,
  totalPages: 1,
  unreadCount: 0,
};

// Broadcast a notification to every user. This reuses the exact same write as the
// single-user `notifyUser` action (a row on the `notifications` table), fanned out over
// all non-admin accounts in batches. `scheduleAt` in the future queues it (persisted on
// `scheduledAt`, the same field the single-user path uses); empty sends immediately.
export async function broadcastNotification(
  input: NotifyPayload,
): Promise<BroadcastResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;

  if (input.type !== "email" && input.type !== "push") {
    return { ok: false, error: "Choose a valid notification type." };
  }

  const message = input.message?.trim();
  if (!message) return { ok: false, error: "Message is required." };

  const title = input.title?.trim() || null;
  // Email carries a subject line; push can stand on the message alone.
  if (input.type === "email" && !title) {
    return { ok: false, error: "A title is required for email notifications." };
  }

  let scheduledAt: Date | null = null;
  if (input.scheduleAt) {
    const when = new Date(input.scheduleAt);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "The schedule time is invalid." };
    }
    if (when.getTime() <= Date.now()) {
      return { ok: false, error: "The schedule time must be in the future." };
    }
    scheduledAt = when;
  }

  // "All users" = every non-admin-tier account. role is nullable and null means "user"
  // (the column default), so include null-role rows explicitly — `notIn` alone drops them.
  const users = await prisma.user.findMany({
    where: { OR: [{ role: { notIn: [...ADMIN_ROLES] } }, { role: null }] },
    select: { id: true },
  });
  if (users.length === 0) {
    return { ok: false, error: "There are no users to notify." };
  }

  for (let start = 0; start < users.length; start += FANOUT_CHUNK) {
    const batch = users.slice(start, start + FANOUT_CHUNK);
    await prisma.notification.createMany({
      data: batch.map((user) => ({
        userId: user.id,
        type: input.type,
        title,
        message,
        scheduledAt,
      })),
    });
  }

  // Nothing admin-facing needs revalidation: broadcast rows are user-owned email/push
  // notices, which the admin alert feed never shows, and the composer's audience count
  // is unchanged by a send. The rows surface on the (future) user-facing notification UI.
  return { ok: true, recipients: users.length, scheduled: scheduledAt !== null };
}

// Read action powering the feed's client-side pagination. Scoped to the signed-in admin.
export async function listAdminNotifications(params: {
  page?: number;
}): Promise<AdminNotificationsResult> {
  const session = await getAdminSession();
  if (!session) return EMPTY_FEED;
  return getAdminNotifications({ adminId: session.user.id, page: params.page });
}

// Mark every unread alert for the signed-in admin as read.
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, type: { in: ALERT_TYPES }, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/admin/notifications");
  return { ok: true };
}

// Mark a single alert read. Scoped by userId (own rows only) and alert type (symmetric
// with markAllNotificationsRead) so a crafted id can't touch a non-alert notification.
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id, type: { in: ALERT_TYPES }, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/admin/notifications");
  return { ok: true };
}
