"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_LENGTH = 8; // matches Better Auth's default minPasswordLength

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (next.length < MIN_LENGTH) {
      toast.error(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    if (next === current) {
      toast.error("New password must be different from the current one.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: revokeOthers,
      });
      if (error) {
        // Better Auth returns a 400 with an "invalid password" style message when the current
        // password is wrong; surface a clear message rather than the raw string.
        toast.error(
          error.status === 400
            ? "Your current password is incorrect."
            : error.message || "Couldn't change your password.",
        );
      } else {
        toast.success("Password changed");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Use a strong password you don&apos;t reuse elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password" className="text-sm font-semibold">
              Current password
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password" className="text-sm font-semibold">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={saving}
              required
            />
            <p className="text-muted-foreground text-xs">At least {MIN_LENGTH} characters.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password" className="text-sm font-semibold">
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={revokeOthers}
              onCheckedChange={(v) => setRevokeOthers(v === true)}
              disabled={saving}
            />
            Sign out other devices
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
