"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X } from "lucide-react";

import { replyToTicket } from "@/app/admin/support-ticket/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { TICKET_FILE_ACCEPT } from "@/lib/tickets/files";
import type { ReplyAttachmentInput } from "./types";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<ReplyAttachmentInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/tickets/upload", { method: "POST", body: form });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; key?: string; url?: string; name?: string; contentType?: string; size?: number; error?: string }
          | null;
        if (!res.ok || !data?.ok || !data.key || !data.url) {
          toast.error(data?.error ?? `Could not upload ${file.name}.`);
          continue;
        }
        setAttachments((current) => [
          ...current,
          {
            name: data.name ?? file.name,
            key: data.key!,
            url: data.url!,
            contentType: data.contentType ?? file.type,
            size: data.size,
          },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(key: string) {
    setAttachments((current) => current.filter((a) => a.key !== key));
  }

  async function handleSend() {
    if (!message.trim()) {
      toast.error("Message is required.");
      return;
    }
    setSending(true);
    try {
      const result = await replyToTicket(ticketId, {
        message: message.trim(),
        attachments,
      });
      if (result.ok) {
        toast.success("Reply sent.");
        setMessage("");
        setAttachments([]);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const busy = uploading || sending;

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Type your message here..."
        rows={4}
        disabled={sending}
      />

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.key}
              className="bg-muted flex items-center gap-1.5 rounded-full py-1 pr-1 pl-3 text-xs"
            >
              <span className="max-w-40 truncate">{attachment.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-full"
                onClick={() => removeAttachment(attachment.key)}
                aria-label={`Remove ${attachment.name}`}
                disabled={sending}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Paperclip className="size-4" />
          {uploading ? "Uploading…" : "Attach"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={TICKET_FILE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <Button type="button" onClick={handleSend} disabled={busy || !message.trim()}>
          <Send className="size-4" />
          {sending ? "Sending…" : "Send Now"}
        </Button>
      </div>
    </div>
  );
}
