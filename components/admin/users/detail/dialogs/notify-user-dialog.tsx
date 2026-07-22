"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionIconButton } from "../shared";
import type { NotificationType, NotifyPayload, UserDetail } from "../types";

export function NotifyUserDialog({
  user,
  onSend,
}: {
  user: UserDetail;
  onSend: (payload: NotifyPayload) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<NotificationType>("email");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  function handleSend() {
    onSend({
      type,
      title: type === "email" ? title : undefined,
      message,
      // Scheduling only applies to in-app (push) notices — a scheduled row surfaces in the
      // bell at its time. There is no worker that dispatches scheduled EMAIL, so an email is
      // always sent now; carrying a schedule for it would silently never deliver.
      scheduleAt: type === "push" ? scheduleAt || undefined : undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton icon={Bell} tint="amber" fill label="Notify User" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notify User</DialogTitle>
          <DialogDescription>
            Send a notification to {user.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Notification Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as NotificationType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "email" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notify-title">Title</Label>
              <Input
                id="notify-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Notification title"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notify-message">Message</Label>
            <Textarea
              id="notify-message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message…"
            />
          </div>

          {type === "push" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notify-schedule">Schedule At</Label>
              <Input
                id="notify-schedule"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Optional — the notice appears in the user&apos;s bell at this time.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={handleSend} disabled={!message.trim()}>
            Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
