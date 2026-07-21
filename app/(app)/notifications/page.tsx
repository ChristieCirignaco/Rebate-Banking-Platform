import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { getUserNotifications } from "@/lib/notifications";
import { NotificationsView } from "@/components/app/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

// The user's own notices (the email/push rows an admin sends them) — not the admin alert
// rows that share the `notifications` table. Not flag-gated: notifications are always on.
export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await getUserNotifications(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/dashboard"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Notifications
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Updates and messages about your account.
            </p>
          </div>
        </div>

        <NotificationsView items={items} />
      </div>
    </div>
  );
}
