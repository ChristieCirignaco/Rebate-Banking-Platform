import {
  contentTypeForKey,
  isImageContentType,
  ticketAttachmentUrl,
} from "@/lib/tickets/files";
import type {
  TicketAttachmentView,
  TicketDetail,
  TicketMessageView,
  TicketPriority,
  TicketStatus,
} from "@/components/admin/support-tickets/types";

// Canonical presenters for tickets, shared by the admin (lib/admin/support-tickets.ts) and user
// (lib/support.ts) read layers so message/attachment/detail shaping can never drift. The
// attachment URL is ALWAYS reconstructed from the storage key (never the stored url), so an
// injected `url` in the JSON is ignored. Pure — no prisma/db import.

export function toTicketAttachmentViews(raw: unknown): TicketAttachmentView[] {
  if (!Array.isArray(raw)) return [];
  const views: TicketAttachmentView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const key = typeof entry.key === "string" ? entry.key : "";
    if (!key) continue;
    const contentType =
      typeof entry.contentType === "string" ? entry.contentType : (contentTypeForKey(key) ?? "");
    views.push({
      name: typeof entry.name === "string" ? entry.name : key,
      key,
      url: ticketAttachmentUrl(key),
      contentType,
      size: typeof entry.size === "number" ? entry.size : undefined,
      isImage: isImageContentType(contentType),
    });
  }
  return views;
}

// The shape both read layers load (Ticket with user + category + ordered messages).
type LoadedTicket = {
  id: string;
  ticketCode: string;
  subject: string;
  body: string;
  priority: string;
  status: string;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string; image: string | null };
  category: { name: string } | null;
  messages: {
    id: string;
    senderType: string;
    senderName: string;
    // Optional: the admin read layer resolves the sender's avatar; the user-side loader leaves
    // it unset and the view degrades to initials.
    senderImage?: string | null;
    body: string;
    attachments: unknown;
    createdAt: Date;
  }[];
};

export function toTicketDetail(ticket: LoadedTicket): TicketDetail {
  return {
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    subject: ticket.subject,
    body: ticket.body,
    priority: ticket.priority as TicketPriority,
    status: ticket.status as TicketStatus,
    categoryName: ticket.category?.name ?? ticket.categoryName ?? null,
    user: {
      id: ticket.user.id,
      name: ticket.user.name,
      email: ticket.user.email,
      avatarUrl: ticket.user.image ?? undefined,
    },
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map(
      (m): TicketMessageView => ({
        id: m.id,
        senderType: m.senderType as "user" | "admin",
        senderName: m.senderName,
        senderImage: m.senderImage ?? undefined,
        body: m.body,
        attachments: toTicketAttachmentViews(m.attachments),
        createdAt: m.createdAt.toISOString(),
      }),
    ),
  };
}
