"use server";

import { getSession, requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import {
  getUnreadCount,
  getUserNotifications,
  userNotificationWhere,
  type UserNotificationItem,
} from "@/lib/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

const FAILED = { ok: false as const, error: "Something went wrong. Please try again." };

// Mark one notification read. Ownership is enforced in the WHERE clause, not by a prior
// fetch-then-check: `updateMany` scoped to {id, userId} touches zero rows when the id
// belongs to someone else. A bare `update({ where: { id } })` would let any signed-in user
// mark any other user's row read, so it is deliberately not used here.
//
// userNotificationWhere also pins this to user-notice types (an admin's own alert rows can
// never be marked through this action) and to visible-now rows (a future-scheduled row
// can't be marked before the user is even shown it).
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const { session } = await requireActiveUser();
  if (!id) return { ok: false, error: "Missing notification id." };

  try {
    await prisma.notification.updateMany({
      where: { ...userNotificationWhere(session.user.id), id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch {
    return FAILED;
  }
}

// Mark every currently-visible unread notice read. Same scoping as the single-row action.
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { session } = await requireActiveUser();

  try {
    await prisma.notification.updateMany({
      where: { ...userNotificationWhere(session.user.id), readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch {
    return FAILED;
  }
}

// Badge count for <NotificationBell />, which self-fetches instead of taking a prop.
// Intentionally uses getSession() rather than requireActiveUser(): this runs on mount on
// every page that renders the header, and requireActiveUser() redirects on a missing or
// non-active session — a background count fetch must never yank the user's navigation.
// A signed-out/ineligible caller just gets 0.
export async function getUnreadCountAction(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  try {
    return await getUnreadCount(session.user.id);
  } catch {
    return 0;
  }
}

// The newest notices for the header panel. Same reasoning as getUnreadCountAction: it fires from
// a popover on any page, so a missing session returns an empty list rather than redirecting. The
// limit is fixed here rather than taken from the client — the panel is a preview, and the full
// list lives at /notifications. Not exported: a "use server" file may only export async
// functions, and nothing outside needs the number.
const NOTIFICATION_PANEL_LIMIT = 10;

export async function getRecentNotificationsAction(): Promise<UserNotificationItem[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    return await getUserNotifications(session.user.id, NOTIFICATION_PANEL_LIMIT);
  } catch {
    return [];
  }
}
