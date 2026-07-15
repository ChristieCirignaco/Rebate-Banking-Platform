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
        Sign-in throttling, sessions, and password rules are handled by the authentication
        layer. The controls below are enforced by the app itself.
      </p>

      <SettingsSection
        title="Login Verification"
        description="Owner-verification for regular users."
      >
        <SettingsToggle
          id="email-otp-on-login"
          label="Require email OTP on login"
          description="After entering their password, users must enter a one-time code sent to their email before their dashboard unlocks."
          checked={form.emailOtpOnLogin}
          onCheckedChange={(v) => set("emailOtpOnLogin", v)}
        />
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
                onChange={(e) => set("screenLockIdleValue", Number(e.target.value) || 0)}
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
