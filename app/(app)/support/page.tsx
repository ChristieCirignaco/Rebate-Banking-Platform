import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getSupportCategories, getUserTickets } from "@/lib/support";
import { SupportView } from "@/components/app/support/support-view";

export const metadata: Metadata = { title: "Support" };

// Support inbox: the user's tickets + a "New ticket" composer. Opening a ticket goes to the
// chat thread at /support/[id]. Same inner-page shell as the other feature pages.
export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Hiding the nav entry isn't enough — the URL is still typeable.
  if (!(await isFeatureEnabled("support"))) redirect("/dashboard");

  const [tickets, categories] = await Promise.all([
    getUserTickets(session.user.id),
    getSupportCategories(),
  ]);

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
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Support</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Open a ticket and chat with our team.</p>
          </div>
        </div>

        <SupportView tickets={tickets} categories={categories} />
      </div>
    </div>
  );
}
