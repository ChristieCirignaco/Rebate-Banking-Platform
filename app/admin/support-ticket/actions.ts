"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getTicketList, TICKET_PAGE_SIZE } from "@/lib/admin/support-tickets";
import { notifyUserOf } from "@/lib/notifications";
import { notifyUser } from "@/app/admin/users/[id]/actions";
import type {
  ReplyPayload,
  TicketListParams,
  TicketListResult,
  TicketStatus,
} from "@/components/admin/support-tickets/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

const STATUSES: TicketStatus[] = ["open", "pending", "replied", "closed"];

const EMPTY_LIST: TicketListResult = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: TICKET_PAGE_SIZE,
  totalPages: 1,
  pendingCount: 0,
};

function revalidate(ticketId?: string) {
  revalidatePath("/admin/support-ticket/pending");
  revalidatePath("/admin/support-ticket/inprogress");
  revalidatePath("/admin/support-ticket/close");
  revalidatePath("/admin/support-ticket/history");
  if (ticketId) revalidatePath(`/admin/support-ticket/show/${ticketId}`);
}

// Read action powering client-side pagination/search/date-range on the four list pages.
export async function listTickets(params: TicketListParams): Promise<TicketListResult> {
  if (!(await getAdminSession())) return EMPTY_LIST;
  return getTicketList(params);
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  // userId/code/subject are read for the user-facing notice below, not the existence check.
  const existing = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, userId: true, ticketCode: true, subject: true },
  });
  if (!existing) return { ok: false, error: "Ticket not found." };

  await prisma.ticket.update({ where: { id }, data: { status } });

  // Best-effort notice, post-commit. Closing is the only status change that's news to the
  // user — open/pending/replied are internal queue movements they don't need a bell for.
  if (status === "closed") {
    await notifyUserOf(existing.userId, {
      type: "email",
      title: "Ticket closed",
      message: `Your ticket #${existing.ticketCode} "${existing.subject}" has been closed.`,
    });
  }

  revalidate(id);
  return { ok: true };
}

// Posts an admin reply into the thread, moves the ticket to "replied" (the typical
// support flow), and notifies the ticket's user through the existing single-user notify
// pipeline — the same one the user inner-details page uses.
export async function replyToTicket(id: string, payload: ReplyPayload): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const message = payload.message?.trim();
  if (!message) return { ok: false, error: "Message is required." };

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, userId: true, ticketCode: true, subject: true },
  });
  if (!ticket) return { ok: false, error: "Ticket not found." };

  const attachments = (payload.attachments ?? []).map((a) => ({
    name: a.name,
    key: a.key,
    url: a.url,
    contentType: a.contentType,
    size: a.size,
  }));

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        id: randomUUID(),
        ticketId: id,
        senderType: "admin",
        senderId: session.user.id,
        senderName: session.user.name,
        body: message,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    }),
    prisma.ticket.update({
      where: { id },
      data: { status: "replied", lastRepliedAt: new Date() },
    }),
  ]);

  // Best-effort — the reply already committed, so a notify failure must not fail the action.
  try {
    await notifyUser(ticket.userId, {
      type: "push",
      title: `Reply to ticket #${ticket.ticketCode}`,
      message: `An agent replied to your ticket "${ticket.subject}".`,
    });
  } catch {
    // best-effort
  }

  revalidate(id);
  return { ok: true };
}
