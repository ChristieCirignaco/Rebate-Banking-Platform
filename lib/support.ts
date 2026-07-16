import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";
import { toTicketAttachmentViews, toTicketDetail } from "@/lib/tickets/present";
import type { TicketDetail, TicketPriority, TicketStatus } from "@/components/admin/support-tickets/types";

// User-facing support reads (the caller's own tickets only) + helpers shared with the actions
// and the attachment serving route. The Ticket/TicketMessage models and admin reply flow already
// exist; this is the user half, scoped to the signed-in user.

export type SupportTicketRow = {
  id: string;
  ticketCode: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryName: string | null;
  preview: string; // last message body (or the opening body)
  lastActivityLabel: string;
  fromAdmin: boolean; // last message was from support (a reply to read)
};

export type SupportCategoryOption = { id: string; name: string };

export async function getSupportCategories(): Promise<SupportCategoryOption[]> {
  const rows = await prisma.supportCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return rows;
}

export async function getUserTickets(userId: string): Promise<SupportTicketRow[]> {
  const tickets = await prisma.ticket.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    include: {
      category: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return tickets.map((t) => {
    const last = t.messages[0];
    return {
      id: t.id,
      ticketCode: t.ticketCode,
      subject: t.subject,
      status: t.status as TicketStatus,
      priority: t.priority as TicketPriority,
      categoryName: t.category?.name ?? t.categoryName ?? null,
      preview: (last?.body ?? t.body).slice(0, 120),
      lastActivityLabel: formatRelativeTime((last?.createdAt ?? t.updatedAt).toISOString()),
      fromAdmin: last?.senderType === "admin",
    };
  });
}

// The full thread for one of the user's OWN tickets (null if it isn't theirs or doesn't exist).
export async function getUserTicketDetail(
  userId: string,
  ticketId: string,
): Promise<TicketDetail | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      category: { select: { name: true } },
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!ticket) return null;
  return toTicketDetail(ticket);
}

// True if the user has a ticket whose messages reference the given attachment key/basename
// (used by the serving route to let an owner view their own thread's attachments).
export async function userOwnsTicketAttachment(userId: string, key: string): Promise<boolean> {
  const rows = await prisma.ticketMessage.findMany({
    where: { ticket: { userId }, attachments: { not: Prisma.DbNull } },
    select: { attachments: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  for (const row of rows) {
    for (const a of toTicketAttachmentViews(row.attachments)) {
      if (a.key === key || a.url.endsWith(`/${key}`)) return true;
    }
  }
  return false;
}
