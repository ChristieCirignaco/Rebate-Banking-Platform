"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { requireActiveUser } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { prisma } from "@/lib/db";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
import { shortCode } from "@/lib/short-code";
import { verifyAttachment } from "@/lib/tickets/attachment-token";
import { isImageContentType } from "@/lib/tickets/files";
import type { TicketAttachmentView, TicketMessageView } from "@/components/admin/support-tickets/types";

export type TicketAttachmentInput = {
  name: string;
  key: string;
  url: string;
  contentType: string;
  size?: number;
  token?: string; // proof the caller uploaded this key (from the upload route); not persisted
};

export type CreateTicketInput = {
  subject: string;
  categoryId?: string;
  priority: string;
  message: string;
  attachments?: TicketAttachmentInput[];
};

export type CreateTicketResult = { ok: true; ticketId: string } | { ok: false; error: string };
export type SendMessageResult =
  | { ok: true; message: TicketMessageView }
  | { ok: false; error: string };

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const CreateSchema = z.object({
  subject: z.string().trim().min(3, "Enter a subject (at least 3 characters).").max(140),
  categoryId: z.string().trim().optional(),
  priority: z.enum(PRIORITIES),
  message: z.string().trim().min(1, "Enter a message.").max(4000),
});

const MessageSchema = z.string().trim().min(1, "Enter a message.").max(4000);

async function uniqueTicketCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = shortCode(7);
    if ((await prisma.ticket.count({ where: { ticketCode: code } })) === 0) return code;
  }
  return shortCode(8);
}

// Accept only attachments this user actually uploaded: our access-controlled URL prefix AND a
// valid per-user upload token (from /api/user/tickets/upload). This blocks injecting another
// user's storage key into your own thread to read it back. The token is not persisted.
function sanitizeAttachments(
  input: TicketAttachmentInput[] | undefined,
  userId: string,
): Omit<TicketAttachmentInput, "token">[] {
  return (input ?? [])
    .filter(
      (a) =>
        a &&
        typeof a.url === "string" &&
        a.url.startsWith("/api/ticket-attachments/") &&
        typeof a.key === "string" &&
        verifyAttachment(a.key, userId, a.token),
    )
    .slice(0, 8)
    .map((a) => ({
      name: String(a.name).slice(0, 200),
      key: String(a.key).slice(0, 200),
      url: a.url,
      contentType: String(a.contentType).slice(0, 100),
      size: typeof a.size === "number" ? a.size : undefined,
    }));
}

function toViews(attachments: TicketAttachmentInput[]): TicketAttachmentView[] {
  return attachments.map((a) => ({ ...a, isImage: isImageContentType(a.contentType) }));
}

export async function createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  // /support redirects when the flag is off, but that only stops the page — this action is
  // callable directly, so the check has to be here too. Replies are gated the same way, so
  // switching Support off closes both new tickets and further messages on existing ones.
  if (!(await isFeatureEnabled("support"))) {
    return { ok: false, error: "Support is currently unavailable." };
  }

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (data.categoryId) {
    const cat = await prisma.supportCategory.findFirst({
      where: { id: data.categoryId, isActive: true },
      select: { id: true, name: true },
    });
    if (cat) {
      categoryId = cat.id;
      categoryName = cat.name;
    }
  }

  const attachments = sanitizeAttachments(input.attachments, userId);
  const code = await uniqueTicketCode();
  const ticketId = randomUUID();

  await prisma.$transaction([
    prisma.ticket.create({
      data: {
        id: ticketId,
        ticketCode: code,
        userId,
        categoryId,
        categoryName,
        subject: data.subject,
        body: data.message,
        priority: data.priority,
        status: "pending", // awaiting a first support response — enters the admin Pending queue
      },
    }),
    prisma.ticketMessage.create({
      data: {
        id: randomUUID(),
        ticketId,
        senderType: "user",
        senderId: userId,
        senderName: session.user.name,
        body: data.message,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    }),
  ]);

  // Best-effort: the ticket is already committed, so a notify failure must never surface as a
  // failed open.
  try {
    await notifyAdmins({
      type: "ticket_opened",
      title: "New support ticket",
      message: `${session.user.name} opened ${data.priority}-priority ticket ${code}: "${data.subject}".`,
    });
  } catch {
    // ignored — the admin queue still shows the ticket.
  }

  // The ticket code is the only handle the user has on this conversation, and until support
  // replies nothing else confirms it was filed — so put the code in their inbox now rather than
  // relying on them staying on the page. Best-effort (notifyUserOf swallows its own errors).
  await notifyUserOf(userId, {
    type: "email",
    title: "Ticket Received",
    message: `Your support ticket ${code} has been received. Our team will reply to you here.`,
    greeting: session.user.name ? `Dear ${session.user.name},` : undefined,
    rows: [
      { label: "Ticket", value: code },
      { label: "Subject", value: data.subject },
    ],
    cta: { label: "View ticket", url: `/support/${ticketId}` },
  });

  return { ok: true, ticketId };
}

// Post a user reply into their own ticket. Returns the created message so the client appends it
// in place (no full-page reload). Sets the ticket back to "pending" (awaiting a support reply).
export async function sendTicketMessage(
  ticketId: string,
  body: string,
  attachments?: TicketAttachmentInput[],
): Promise<SendMessageResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("support"))) {
    return { ok: false, error: "Support is currently unavailable." };
  }

  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId },
    // ticketCode rides along on the row we already load so the admin notice names the ticket the
    // way the admin queue does, without a second query.
    select: { id: true, status: true, ticketCode: true },
  });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (ticket.status === "closed") {
    return { ok: false, error: "This ticket is closed. Open a new one if you still need help." };
  }

  const clean = sanitizeAttachments(attachments, userId);
  const messageId = randomUUID();
  const createdAt = new Date();

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        id: messageId,
        ticketId,
        senderType: "user",
        senderId: userId,
        senderName: session.user.name,
        body: parsed.data,
        attachments: clean.length > 0 ? clean : undefined,
        createdAt,
      },
    }),
    prisma.ticket.update({ where: { id: ticketId }, data: { status: "pending" } }),
  ]);

  // Best-effort: the reply is already committed, so a notify failure must never surface as a
  // failed send.
  try {
    await notifyAdmins({
      type: "ticket_reply",
      title: "New ticket reply",
      message: `${session.user.name} replied to ticket ${ticket.ticketCode}.`,
    });
  } catch {
    // ignored — the admin queue still shows the reply.
  }

  return {
    ok: true,
    message: {
      id: messageId,
      senderType: "user",
      senderName: session.user.name,
      body: parsed.data,
      attachments: toViews(clean),
      createdAt: createdAt.toISOString(),
    },
  };
}
