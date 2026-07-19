import { prisma } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/auth-guards";
import { sendEmail } from "@/lib/email";
import { renderEmail, type EmailAudience, type EmailRow } from "@/lib/email/template";
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
  // Transaction facts for the email's detail table (amount, reference, method). The bell row
  // carries only title + message; these enrich the mail without bloating the in-app copy.
  rows?: EmailRow[];
  // Where in /admin this needs actioning. Defaults to the alert feed.
  href?: string;
  // Opt out of mail for a low-signal alert; the bell row is still written.
  email?: boolean;
}): Promise<number> {
  // Active admins only — a deactivated account would otherwise keep accruing alerts nobody
  // will ever read.
  const admins = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] }, status: "active" },
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

  // Mail the operators too. Best-effort and after the rows: the feed is the durable record, so
  // a mailer outage costs the email, never the alert. deliverEmailNotices swallows its own
  // errors, so this can't throw into the money action that raised it.
  if (args.email !== false) {
    await deliverEmailNotices(
      admins.map((admin) => admin.id),
      args.title,
      args.message,
      {
        audience: "admin",
        rows: args.rows,
        cta: { label: "Review in admin", url: args.href ?? "/admin/notifications" },
      },
    );
  }
  return admins.length;
}

// Notify ONE user. The counterpart to notifyAdmins and, like it, deliberately session-free:
// most notices are raised by the user's own action (their deposit landed, their voucher was
// redeemed), so an authorization check here would be wrong — the caller has already
// established who may act. `notifyUser` in app/admin/users/[id]/actions.ts is the admin-facing
// wrapper that adds the admin-session + regular-target checks on top of this.
//
// Callers treat notifications as best-effort: a failure here must never roll back the money
// action that triggered it, so this swallows its own errors and reports success as a boolean
// rather than throwing into someone's transaction.
export async function notifyUserOf(
  userId: string,
  args: {
    type?: UserNoticeType;
    title: string;
    message: string;
    // Detail table + link for the EMAIL only. The bell row stays title + message: the in-app
    // notice sits next to the transaction it describes, whereas the email is read cold in an
    // inbox and has to carry the facts (amount, wallet, resulting balance) on its own.
    rows?: EmailRow[];
    cta?: { label: string; url: string };
    // Email-only salutation ("Dear Jane,") rendered as its own paragraph above `message`. Kept
    // out of `message` because that string is also the in-app bell row, where a greeting reads
    // as noise and would push the actual news out of the preview.
    greeting?: string;
  },
): Promise<boolean> {
  try {
    if (!userId) return false;
    // "push" is the in-app default — it lands in the bell and nowhere else. "email" ALSO gets
    // mailed (see deliverEmailNotices); the row is written either way, so the bell is the
    // durable record and mail is a delivery channel on top of it.
    const type = args.type ?? "push";
    await prisma.notification.create({
      data: {
        userId,
        type,
        title: args.title,
        message: args.message,
        // These are always immediate (no scheduledAt), so an email notice is mailed below and
        // stamped now — keeping `emailedAt == null` a reliable "still owed an email" test.
        emailedAt: type === "email" ? new Date() : null,
      },
    });
    if (type === "email")
      await deliverEmailNotices([userId], args.title, args.message, {
        rows: args.rows,
        cta: args.cta,
        greeting: args.greeting,
      });
    return true;
  } catch {
    return false;
  }
}

// Mail the "email"-type notices out. Separate from the row write so the bell record survives a
// mailer outage: sendEmail is itself fire-and-forget (it logs rather than throws, and no-ops to
// the console when RESEND_API_KEY is unset), and this never throws into a caller's money action.
//
// LIMITATION worth knowing: this sends at write time. A notice with a future `scheduledAt` is
// therefore NOT mailed here — nothing in the app dispatches on that column yet, so a scheduled
// email would need a cron/queue to mail at the right moment. Callers pass only due notices.
export async function deliverEmailNotices(
  userIds: string[],
  title: string | null,
  message: string,
  extra?: {
    rows?: EmailRow[];
    cta?: { label: string; url: string };
    audience?: EmailAudience;
    greeting?: string;
  },
): Promise<void> {
  try {
    if (userIds.length === 0) return;
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    });
    if (users.length === 0) return;

    const audience = extra?.audience ?? "user";
    // Rendered once, not per recipient: the body is identical and loadBrand() would otherwise
    // re-read the settings rows for every address in a broadcast.
    const mail = await renderEmail({
      audience,
      heading: title?.trim() || "Notification",
      paragraphs: extra?.greeting ? [extra.greeting, message] : [message],
      rows: extra?.rows,
      cta: extra?.cta ?? { label: "Open dashboard", url: audience === "admin" ? "/admin" : "/dashboard" },
      note:
        audience === "user"
          ? "You're receiving this because of activity on your account."
          : undefined,
    });

    // Bounded concurrency: a broadcast can span every user, and firing thousands of requests at
    // once would swamp the mailer's rate limit and the event loop alike.
    const BATCH = 20;
    for (let i = 0; i < users.length; i += BATCH) {
      await Promise.all(
        users.slice(i, i + BATCH).map((user) =>
          sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html }),
        ),
      );
    }
  } catch (error) {
    console.error("[notifications] email delivery failed:", error);
  }
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
