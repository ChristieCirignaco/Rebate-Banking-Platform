"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { changePassword } from "@/app/(app)/account/security/actions";
import { toast } from "@/lib/toast";
import { ResultDialog, type ResultPayload } from "@/components/app/result-dialog";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/account/settings-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Change the sign-in password. Sits on the security page beside the PIN and 2FA — before this
// existed a signed-in user had no way to change their password at all and had to sign out and
// use the forgot-password email instead.
//
// hasPassword is false for an account with no credential row (social sign-in only): there is no
// password to change, so the form would fail on submit no matter what was typed. Say so instead.
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (res.ok) {
        toast.success("Password updated. Any other devices were signed out.");
        setResult({
          status: "completed",
          title: "Password updated",
          message: "Your password has been changed and any other signed-in devices were signed out.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error);
        setResult({ status: "error", title: "Couldn't update your password", message: res.error });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setResult({
        status: "error",
        title: "Couldn't update your password",
        message:
          "We couldn't reach the server. Your password is unchanged — check your connection and try again.",
      });
    }
    // Always reset, including after an error — otherwise a failed attempt leaves the form
    // permanently disabled with no way back but a reload.
    setSaving(false);
  }

  return (
    <SettingsCard
      icon={Lock}
      title="Password"
      description={
        hasPassword
          ? "Change the password you use to sign in."
          : "This account signs in without a password."
      }
    >
      {hasPassword ? (
        <form onSubmit={onSubmit} className="flex max-w-xs flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Changing your password signs out every other device.
          </p>
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You signed up with a provider rather than a password, so there&apos;s
          nothing to change here. Two-factor authentication and your transaction
          PIN still apply.
        </p>
      )}

      <ResultDialog
        open={Boolean(result)}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
        result={result}
        primaryLabel={result?.status === "error" ? "Try again" : "Done"}
      />
    </SettingsCard>
  );
}
