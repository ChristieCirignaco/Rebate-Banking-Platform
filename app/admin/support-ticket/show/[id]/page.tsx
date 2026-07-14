import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TicketMessageBubble } from "@/components/admin/support-tickets/ticket-message-bubble";
import { TicketPriorityBadge } from "@/components/admin/support-tickets/ticket-badges";
import { TicketReplyForm } from "@/components/admin/support-tickets/ticket-reply-form";
import { TicketStatusSelect } from "@/components/admin/support-tickets/ticket-status-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { initials } from "@/lib/utils";
import { getTicketDetail } from "@/lib/admin/support-tickets";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getTicketDetail(id);
  return { title: ticket ? `Ticket #${ticket.ticketCode}` : "Ticket" };
}

export default async function TicketDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const ticket = await getTicketDetail(id);
  if (!ticket) notFound();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Link
        href="/admin/support-ticket/pending"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to tickets
      </Link>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TicketPriorityBadge priority={ticket.priority} />
              <span className="text-muted-foreground font-mono text-sm">
                Ticket ID: #{ticket.ticketCode}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Support Ticket Details
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  {ticket.user.avatarUrl ? (
                    <AvatarImage src={ticket.user.avatarUrl} alt={ticket.user.name} />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {initials(ticket.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{ticket.user.name}</span>
                  <span className="text-muted-foreground text-xs">{ticket.user.email}</span>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">
                {ticket.categoryName ?? "Uncategorized"}
              </span>
              <span
                suppressHydrationWarning
                className="text-muted-foreground text-sm"
              >
                Opened {formatDateTime(ticket.createdAt)}
              </span>
            </div>
          </div>
          <TicketStatusSelect key={ticket.status} id={ticket.id} status={ticket.status} />
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-4 sm:p-6">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {ticket.subject}
        </h2>
        <p className="text-sm break-words whitespace-pre-wrap">{ticket.body}</p>
      </Card>

      <Card className="flex flex-col gap-5 p-4 sm:p-6">
        <h2 className="text-sm font-medium">Conversation</h2>
        {ticket.messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No replies yet — send the first message below.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {ticket.messages.map((message) => (
              <TicketMessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-medium">Reply</h2>
        <TicketReplyForm ticketId={ticket.id} />
      </Card>
    </div>
  );
}
