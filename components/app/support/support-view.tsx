"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Loader2, MessageSquarePlus, Paperclip, Plus, X } from "lucide-react";

import { createTicket, type TicketAttachmentInput } from "@/app/(app)/support/actions";
import { toast } from "@/lib/toast";
import { TICKET_FILE_ACCEPT, uploadTicketAttachment } from "@/lib/tickets/files";
import { cn } from "@/lib/utils";
import type { SupportCategoryOption, SupportTicketRow } from "@/lib/support";
import type { TicketStatus } from "@/components/admin/support-tickets/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  replied: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";
const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

export function SupportView({
  tickets,
  categories,
}: {
  tickets: SupportTicketRow[];
  categories: SupportCategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:w-auto sm:self-start"
      >
        <Plus className="size-4" />
        New ticket
      </button>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
          <MessageSquarePlus className="size-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No tickets yet</p>
          <p className="text-xs text-slate-400">Open a ticket and our team will get back to you.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{t.subject}</p>
                  {t.fromAdmin && t.status === "replied" ? (
                    <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="New reply" />
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {t.fromAdmin ? "Support: " : ""}
                  {t.preview}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  #{t.ticketCode} · {t.lastActivityLabel}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  STATUS_STYLE[t.status],
                )}
              >
                {t.status}
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-300" />
            </Link>
          ))}
        </div>
      )}

      <NewTicketDialog open={open} onOpenChange={setOpen} categories={categories} />
    </div>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: SupportCategoryOption[];
}) {
  const [subject, setSubject] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachmentInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSubject("");
    setCategoryId("");
    setPriority("medium");
    setMessage("");
    setAttachments([]);
    setUploading(false);
  }

  async function onAttach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadTicketAttachment(file);
    if (res.ok) setAttachments((a) => [...a, res.file]);
    else toast.error(res.error);
    setUploading(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (subject.trim().length < 3) {
      toast.error("Enter a subject (at least 3 characters).");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter a message.");
      return;
    }
    if (uploading) {
      toast.error("Wait for the file to finish uploading.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createTicket({
        subject: subject.trim(),
        categoryId: categoryId || undefined,
        priority,
        message: message.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (res.ok) {
        toast.success("Ticket created");
        window.location.href = `/support/${res.ticketId}`;
        return;
      }
      toast.error(res.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>Tell us what you need help with.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-category" className="text-sm font-semibold">
                Category
              </Label>
              <select
                id="t-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={SELECT}
              >
                <option value="">General</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-priority" className="text-sm font-semibold">
                Priority
              </Label>
              <select
                id="t-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={SELECT}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-subject" className="text-sm font-semibold">
              Subject
            </Label>
            <Input
              id="t-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
              placeholder="e.g. My withdrawal is pending"
              className={FIELD}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-message" className="text-sm font-semibold">
              Message
            </Label>
            <Textarea
              id="t-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Describe your issue…"
              className="rounded-xl border-slate-200 bg-slate-50/70 text-base"
            />
          </div>

          {/* Attachments. The backend already accepted these on the very first message —
              CreateTicketInput.attachments, sanitized like any reply — but there was no way to
              pick a file here, so a user reporting a problem had to create the ticket and then
              attach the screenshot in a follow-up reply. */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-semibold">Attachments (optional)</Label>
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <FileText className="size-3.5 text-slate-400" />
                    <span className="max-w-[10rem] truncate">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => setAttachments((list) => list.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <label
              className={cn(
                "inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600",
                (uploading || submitting) && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="file"
                accept={TICKET_FILE_ACCEPT}
                className="sr-only"
                disabled={uploading || submitting}
                onChange={(e) => {
                  void onAttach(e.target.files?.[0]);
                  // Clear the input so picking the same file twice still fires onChange.
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              {uploading ? "Uploading…" : "Attach a file"}
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Create ticket
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
