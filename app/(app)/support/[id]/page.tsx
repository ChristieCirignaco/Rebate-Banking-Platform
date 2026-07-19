import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getUserTicketDetail } from "@/lib/support";
import { TicketChat } from "@/components/app/support/ticket-chat";

export const metadata: Metadata = { title: "Support ticket" };

// One ticket's chat thread. The ticket is scoped to the signed-in user (getUserTicketDetail
// returns null for anyone else's), so a user can only open their own threads.
export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // The list at /support is gated; this detail route wasn't, so an existing ticket stayed
  // openable by URL after Support was switched off. Redirect to /dashboard rather than /support,
  // which is itself disabled.
  if (!(await isFeatureEnabled("support"))) redirect("/dashboard");

  const { id } = await params;
  const detail = await getUserTicketDetail(session.user.id, id);
  if (!detail) redirect("/support");

  const meImage =
    detail.user.id === session.user.id ? (detail.user.avatarUrl ?? null) : null;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/support"
            aria-label="Back to support"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Ticket</h1>
            <p className="text-sm text-slate-500">Chat with our support team.</p>
          </div>
        </div>

        <TicketChat detail={detail} meImage={meImage} />
      </div>
    </div>
  );
}
