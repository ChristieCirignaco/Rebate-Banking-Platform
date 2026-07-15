"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updatePluginsSettings } from "@/app/admin/settings/actions";
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
  CHAT_PROVIDERS,
  type AnalyticsProvider,
  type ChatProvider,
  type PluginsSettings,
  type RecaptchaVersion,
} from "@/lib/settings/defs";
import { SettingsField, SettingsSection, SettingsToggle } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

export function PluginsForm({
  initial,
  secretsSet,
}: {
  initial: PluginsSettings;
  secretsSet: Record<string, boolean>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof PluginsSettings>(key: K, value: PluginsSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updatePluginsSettings(form);
      if (result.ok) {
        toast.success("Plugins saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const secretHint = "A value is saved. Leave blank to keep it, or type a new one to replace.";

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Google reCAPTCHA"
        description="Protects public forms (login, registration) from bots."
      >
        <SettingsToggle
          id="recaptcha-enabled"
          label="Enable reCAPTCHA"
          checked={form.recaptchaEnabled}
          onCheckedChange={(v) => set("recaptchaEnabled", v)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Version" htmlFor="recaptcha-version">
            <Select
              value={form.recaptchaVersion}
              onValueChange={(v) => set("recaptchaVersion", v as RecaptchaVersion)}
            >
              <SelectTrigger id="recaptcha-version" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v2">v2 (checkbox)</SelectItem>
                <SelectItem value="v3">v3 (score-based)</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Site Key" htmlFor="recaptcha-site-key">
            <Input
              id="recaptcha-site-key"
              value={form.recaptchaSiteKey}
              onChange={(e) => set("recaptchaSiteKey", e.target.value)}
              placeholder="6Lc…"
            />
          </SettingsField>
        </div>
        <SettingsField
          label="Secret Key"
          htmlFor="recaptcha-secret-key"
          description={secretsSet.recaptchaSecretKey ? secretHint : "Kept encrypted at rest."}
        >
          <Input
            id="recaptcha-secret-key"
            type="password"
            autoComplete="off"
            value={form.recaptchaSecretKey}
            onChange={(e) => set("recaptchaSecretKey", e.target.value)}
            placeholder={secretsSet.recaptchaSecretKey ? "•••••••• (saved)" : "Secret key"}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Live Chat"
        description="Embed a support-chat widget. Choose your provider and paste its property / widget ID."
      >
        <SettingsToggle
          id="chat-enabled"
          label="Enable Live Chat"
          checked={form.chatEnabled}
          onCheckedChange={(v) => set("chatEnabled", v)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Provider" htmlFor="chat-provider">
            <Select
              value={form.chatProvider || "none"}
              onValueChange={(v) => set("chatProvider", (v === "none" ? "" : v) as ChatProvider)}
            >
              <SelectTrigger id="chat-provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CHAT_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField
            label="Property / Widget ID"
            htmlFor="chat-property-id"
            description="The ID or tag from your live-chat dashboard."
          >
            <Input
              id="chat-property-id"
              value={form.chatPropertyId}
              onChange={(e) => set("chatPropertyId", e.target.value)}
              placeholder="e.g. 64f0a1b2c3…"
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="IPinfo.io"
        description="Resolves real user IPs to location & network. When enabled, the user Activity Log is enriched with geo/org data; otherwise it falls back to the raw session IP."
      >
        <SettingsToggle
          id="ipinfo-enabled"
          label="Enable IPinfo"
          checked={form.ipinfoEnabled}
          onCheckedChange={(v) => set("ipinfoEnabled", v)}
        />
        <SettingsField
          label="Access Token"
          htmlFor="ipinfo-token"
          description={secretsSet.ipinfoToken ? secretHint : "Kept encrypted at rest."}
        >
          <Input
            id="ipinfo-token"
            type="password"
            autoComplete="off"
            value={form.ipinfoToken}
            onChange={(e) => set("ipinfoToken", e.target.value)}
            placeholder={secretsSet.ipinfoToken ? "•••••••• (saved)" : "IPinfo access token"}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Analytics" description="Site traffic measurement.">
        <SettingsToggle
          id="analytics-enabled"
          label="Enable Analytics"
          checked={form.analyticsEnabled}
          onCheckedChange={(v) => set("analyticsEnabled", v)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Provider" htmlFor="analytics-provider">
            <Select
              value={form.analyticsProvider || "none"}
              onValueChange={(v) =>
                set("analyticsProvider", (v === "none" ? "" : v) as AnalyticsProvider)
              }
            >
              <SelectTrigger id="analytics-provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="ga4">Google Analytics 4</SelectItem>
                <SelectItem value="gtm">Google Tag Manager</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Measurement / Container ID" htmlFor="analytics-id">
            <Input
              id="analytics-id"
              value={form.analyticsMeasurementId}
              onChange={(e) => set("analyticsMeasurementId", e.target.value)}
              placeholder="G-XXXXXXX or GTM-XXXXXX"
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
