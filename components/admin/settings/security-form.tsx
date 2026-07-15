"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateSecuritySettings } from "@/app/admin/settings/actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
  SCREEN_LOCK_UNITS,
  type ScreenLockUnit,
  type SecuritySettings,
} from "@/lib/settings/defs";
import { SettingsField, SettingsSection, SettingsToggle } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

export function SecurityForm({ initial }: { initial: SecuritySettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function num(value: string): number {
    return Number(value) || 0;
  }

  function save() {
    startTransition(async () => {
      const result = await updateSecuritySettings(form);
      if (result.ok) {
        toast.success("Security settings saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        The Screen Lock below is live now. The authentication, password, and session
        policies are stored here and enforced alongside the user-facing auth flow (2FA,
        email verification, login throttling) in a later pass.
      </p>

      <SettingsSection title="Authentication">
        <SettingsToggle
          id="force-email-verification"
          label="Require email verification before login"
          description="Users must confirm their email address before they can sign in."
          checked={form.forceEmailVerification}
          onCheckedChange={(v) => set("forceEmailVerification", v)}
        />
        <SettingsToggle
          id="require-2fa-admins"
          label="Require 2FA for admins"
          description="Admin accounts must enrol in two-factor authentication."
          checked={form.require2faAdmins}
          onCheckedChange={(v) => set("require2faAdmins", v)}
        />
        <SettingsToggle
          id="require-2fa-withdrawals"
          label="Require 2FA step-up for withdrawals"
          description="Prompt for a second factor before a withdrawal is processed."
          checked={form.require2faWithdrawals}
          onCheckedChange={(v) => set("require2faWithdrawals", v)}
        />
      </SettingsSection>

      <SettingsSection title="Password Policy">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SettingsField label="Minimum Length" htmlFor="password-min-length">
            <Input
              id="password-min-length"
              type="number"
              min={6}
              max={128}
              value={form.passwordMinLength}
              onChange={(e) => set("passwordMinLength", num(e.target.value))}
            />
          </SettingsField>
        </div>
        <SettingsToggle
          id="password-mixed-case"
          label="Require mixed case"
          checked={form.passwordRequireMixedCase}
          onCheckedChange={(v) => set("passwordRequireMixedCase", v)}
        />
        <SettingsToggle
          id="password-number"
          label="Require a number"
          checked={form.passwordRequireNumber}
          onCheckedChange={(v) => set("passwordRequireNumber", v)}
        />
        <SettingsToggle
          id="password-symbol"
          label="Require a symbol"
          checked={form.passwordRequireSymbol}
          onCheckedChange={(v) => set("passwordRequireSymbol", v)}
        />
      </SettingsSection>

      <SettingsSection title="Sessions & Login">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SettingsField
            label="Session Lifetime (minutes)"
            htmlFor="session-lifetime"
            description="How long a login stays valid."
          >
            <Input
              id="session-lifetime"
              type="number"
              min={1}
              value={form.sessionLifetimeMinutes}
              onChange={(e) => set("sessionLifetimeMinutes", num(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Max Login Attempts" htmlFor="login-max-attempts">
            <Input
              id="login-max-attempts"
              type="number"
              min={1}
              value={form.loginMaxAttempts}
              onChange={(e) => set("loginMaxAttempts", num(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Lockout Window (minutes)" htmlFor="login-lockout">
            <Input
              id="login-lockout"
              type="number"
              min={1}
              value={form.loginLockoutMinutes}
              onChange={(e) => set("loginLockoutMinutes", num(e.target.value))}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Screen Lock"
        description="Automatically lock the admin panel after a period of inactivity. The admin must re-enter their password to unlock."
      >
        <SettingsToggle
          id="screen-lock-enabled"
          label="Enable screen lock"
          description="Lock the admin session when idle."
          checked={form.screenLockEnabled}
          onCheckedChange={(v) => set("screenLockEnabled", v)}
        />
        {form.screenLockEnabled ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField label="Idle Time" htmlFor="screen-lock-value">
              <Input
                id="screen-lock-value"
                type="number"
                min={1}
                value={form.screenLockIdleValue}
                onChange={(e) => set("screenLockIdleValue", num(e.target.value))}
              />
            </SettingsField>
            <SettingsField label="Unit" htmlFor="screen-lock-unit">
              <Select
                value={form.screenLockIdleUnit}
                onValueChange={(v) => set("screenLockIdleUnit", v as ScreenLockUnit)}
              >
                <SelectTrigger id="screen-lock-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_LOCK_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
