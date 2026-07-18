"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Mail, Send, Smartphone, Users } from "lucide-react";

import { broadcastNotification } from "@/app/admin/notifications/actions";
import { toast } from "@/lib/toast";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { NotificationType } from "@/components/admin/users/detail/types";

// True only after hydration, so clock-dependent values render client-side only (no
// SSR/hydration attribute mismatch). Mirrors the shared StackedTime pattern.
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Current local time as a datetime-local value (minute precision), for the picker's min.
function localNowValue(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function BroadcastComposer({ audienceSize }: { audienceSize: number }) {
  const [type, setType] = useState<NotificationType>("email");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [isPending, startTransition] = useTransition();

  // Lower-bound the picker at "now", client-side only so the hydration markup matches.
  const hydrated = useHydrated();
  const minSchedule = hydrated ? localNowValue() : "";

  const titleRequired = type === "email";
  const canSend =
    message.trim().length > 0 && (!titleRequired || title.trim().length > 0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend || isPending) return;

    // Resolve the timezone-naive datetime-local value to an absolute instant in the
    // admin's own timezone, so the server's future-check and stored time are unambiguous.
    let scheduleInstant: string | undefined;
    if (scheduleAt) {
      const when = new Date(scheduleAt);
      if (!Number.isNaN(when.getTime())) scheduleInstant = when.toISOString();
    }

    startTransition(async () => {
      const result = await broadcastNotification({
        type,
        title: title.trim() || undefined,
        message: message.trim(),
        // Scheduling only applies to in-app (push) notices — nothing dispatches scheduled EMAIL,
        // so an email always sends now (carrying a schedule for it would silently never deliver).
        scheduleAt: type === "push" ? scheduleInstant : undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const reach = `${formatNumber(result.recipients)} ${
        result.recipients === 1 ? "user" : "users"
      }`;
      toast.success(
        result.scheduled
          ? `Broadcast scheduled for ${reach}.`
          : `Notification sent to ${reach}.`,
      );

      // Reset the composer for the next broadcast.
      setTitle("");
      setMessage("");
      setScheduleAt("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Compose broadcast</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broadcast-audience">Audience</Label>
            <Select value="all" disabled>
              <SelectTrigger id="broadcast-audience" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Users className="size-3.5" />
              Reaches {formatNumber(audienceSize)}{" "}
              {audienceSize === 1 ? "user" : "users"}.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broadcast-type">Notification Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as NotificationType)}
            >
              <SelectTrigger id="broadcast-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broadcast-title">
              Title
              {titleRequired ? (
                <span aria-hidden className="text-destructive">
                  {" "}
                  *
                </span>
              ) : (
                <span className="text-muted-foreground"> (optional)</span>
              )}
            </Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === "email" ? "Email subject" : "Notification heading"
              }
              required={titleRequired}
              aria-required={titleRequired}
              maxLength={150}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broadcast-message">Message</Label>
            <Textarea
              id="broadcast-message"
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message…"
              maxLength={2000}
            />
          </div>

          {type === "push" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-schedule">
                Schedule At{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="broadcast-schedule"
                type="datetime-local"
                value={scheduleAt}
                min={minSchedule || undefined}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="w-full sm:w-64"
              />
              <p className="text-muted-foreground text-xs">
                Leave empty to send immediately; scheduled notices appear in each user&apos;s bell
                at that time.
              </p>
            </div>
          ) : null}

          <div>
            <Button type="submit" disabled={!canSend || isPending}>
              <Send className="size-4" />
              {isPending ? "Sending…" : "Send Notification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview of what recipients will get. */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {type === "email" ? (
              <Mail className="size-4" />
            ) : (
              <Smartphone className="size-4" />
            )}
            {type === "email" ? "Email preview" : "Push preview"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="font-medium break-words">
              {title.trim() || (
                <span className="text-muted-foreground">
                  {titleRequired ? "Your title" : "Untitled"}
                </span>
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-sm break-words whitespace-pre-wrap">
              {message.trim() || "Your message will appear here…"}
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
