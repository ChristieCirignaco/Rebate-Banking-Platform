"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Lock, Paperclip, Send, X } from "lucide-react";

import { sendTicketMessage, type TicketAttachmentInput } from "@/app/(app)/support/actions";
import { toast } from "@/lib/toast";
import { TICKET_FILE_ACCEPT, uploadTicketAttachment } from "@/lib/tickets/files";
import { cn } from "@/lib/utils";
import type {
  TicketAttachmentView,
  TicketDetail,
  TicketMessageView,
  TicketStatus,
} from "@/components/admin/support-tickets/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  replied: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function Attachment({ a }: { a: TicketAttachmentView }) {
  if (a.isImage) {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt={a.name}
          className="max-h-44 max-w-full rounded-xl border border-black/5 object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/50"
    >
      <FileText className="size-4 shrink-0 text-slate-400 dark:text-slate-500" />
      <span className="truncate">{a.name}</span>
    </a>
  );
}

function MessageRow({
  m,
  meImage,
}: {
  m: TicketMessageView;
  meImage: string | null;
}) {
  const mine = m.senderType === "user";
  return (
    <div className={cn("flex items-end gap-2.5", mine && "flex-row-reverse")}>
      <Avatar size="default" className={cn(!mine && "bg-blue-600")}>
        {mine && meImage ? <AvatarImage src={meImage} alt="" /> : null}
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            mine ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-blue-600 text-white",
          )}
        >
          {mine ? initials(m.senderName) : "S"}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex max-w-[80%] min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
        {!mine ? (
          <span className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">{m.senderName}</span>
        ) : null}
        {m.body.trim() ? (
          <div
            className={cn(
              "w-fit max-w-full overflow-hidden rounded-2xl px-3.5 py-2 text-sm leading-relaxed wrap-break-word",
              mine
                ? "rounded-br-md bg-blue-600 text-white"
                : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
            )}
          >
            {m.body}
          </div>
        ) : null}
        {m.attachments.map((a, i) => (
          <Attachment key={i} a={a} />
        ))}
        <span className="px-1 text-[11px] text-slate-400 dark:text-slate-500">{timeLabel(m.createdAt)}</span>
      </div>
    </div>
  );
}

export function TicketChat({
  detail,
  meImage,
}: {
  detail: TicketDetail;
  meImage: string | null;
}) {
  const [messages, setMessages] = useState<TicketMessageView[]>(detail.messages);
  const [status, setStatus] = useState<TicketStatus>(detail.status);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachmentInput[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const closed = status === "closed";

  function onSend(event: React.FormEvent) {
    event.preventDefault();
    void doSend();
  }

  async function doSend() {
    if (sending || uploading) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await sendTicketMessage(detail.id, text, attachments);
      if (res.ok) {
        setMessages((m) => [...m, res.message]);
        setStatus("pending");
        setBody("");
        setAttachments([]);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Couldn't send your message. Please try again.");
    }
    setSending(false);
  }

  async function onAttach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadTicketAttachment(file);
    if (res.ok) setAttachments((a) => [...a, res.file]);
    else toast.error(res.error);
    setUploading(false);
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[68vh]">
      {/* Thread header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{detail.subject}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            #{detail.ticketCode}
            {detail.categoryName ? ` · ${detail.categoryName}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
            STATUS_STYLE[status],
          )}
        >
          {status}
        </span>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1">
        {messages.map((m) => (
          <MessageRow key={m.id} m={m} meImage={meImage} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {closed ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <Lock className="size-4" />
          This ticket is closed.
        </div>
      ) : (
        <form onSubmit={onSend} className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  <FileText className="size-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="max-w-[10rem] truncate">{a.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => setAttachments((list) => list.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <label
              className={cn(
                "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-blue-400",
                uploading && "pointer-events-none opacity-60",
              )}
              aria-label="Attach a file"
            >
              <input
                type="file"
                accept={TICKET_FILE_ACCEPT}
                className="sr-only"
                disabled={uploading || sending}
                onChange={(e) => {
                  void onAttach(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
            </label>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void doSend();
                }
              }}
              rows={1}
              placeholder="Type a message…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:focus-visible:bg-slate-900"
            />

            <button
              type="submit"
              disabled={sending || uploading || !body.trim()}
              aria-label="Send"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
