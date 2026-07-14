// Shared types for the Communication section. Kept free of server/client-only imports
// so both the data layer and the client components can pull from here.

// System-generated admin alerts live on the SAME `notifications` table as user-facing
// email/push notifications (see the Notification model). Following the repo's
// String-enum convention (a String column + inline comment, no Prisma enums), an admin
// alert is just a Notification row whose `type` is one of these values, owned by an admin.
export const SYSTEM_ALERT_TYPES = [
  "kyc_submitted",
  "deposit_requested",
  "withdraw_requested",
] as const;

export type SystemAlertType = (typeof SYSTEM_ALERT_TYPES)[number];

// A single row in the admin "All Notifications" feed.
export interface AdminNotificationItem {
  id: string;
  type: string; // a SystemAlertType (unknown/legacy values fall back to a generic look)
  title: string | null;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

// A page of the feed plus the counts the header needs.
export interface AdminNotificationsResult {
  rows: AdminNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

// Outcome of a broadcast: how many users were reached and whether it was queued.
export type BroadcastResult =
  | { ok: true; recipients: number; scheduled: boolean }
  | { ok: false; error: string };
