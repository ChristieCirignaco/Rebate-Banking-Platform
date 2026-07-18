"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { updateGeneralSettings } from "@/app/admin/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import type { GeneralSettings } from "@/lib/settings/defs";
import { SettingsField, SettingsSection } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

function KeywordsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    // Split on commas so a pasted/typed comma-separated string (e.g. "book,pen,go,") becomes
    // one chip per keyword, not a single keyword. Trims, drops empties, and dedupes both
    // against the existing keywords and within the batch itself.
    const next = [...value];
    for (const raw of draft.split(",")) {
      const tag = raw.trim();
      if (tag && !next.includes(tag)) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="Type a keyword and press Enter"
        aria-label="Add SEO keyword"
      />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GeneralForm({
  initial,
  timezones,
  currencies,
}: {
  initial: GeneralSettings;
  timezones: string[];
  currencies: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateGeneralSettings(form);
      if (result.ok) {
        toast.success("General settings saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const currencyOptions = currencies.length
    ? currencies
    : [{ code: form.defaultCurrency || "USD", name: form.defaultCurrency || "USD" }];

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Site Identity"
        description="How the platform presents itself and appears in search."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Site Title" htmlFor="site-title">
            <Input
              id="site-title"
              value={form.siteTitle}
              onChange={(event) => set("siteTitle", event.target.value)}
              maxLength={120}
            />
          </SettingsField>
          <SettingsField label="Brand / Company Name" htmlFor="brand-name">
            <Input
              id="brand-name"
              value={form.brandName}
              onChange={(event) => set("brandName", event.target.value)}
              maxLength={120}
            />
          </SettingsField>
        </div>
        <SettingsField label="Description" htmlFor="site-description">
          <Textarea
            id="site-description"
            rows={2}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={300}
          />
        </SettingsField>
        <SettingsField
          label="SEO Keywords"
          description="Used in the site meta tags. Press Enter or comma to add."
        >
          <KeywordsInput value={form.seoKeywords} onChange={(next) => set("seoKeywords", next)} />
        </SettingsField>
        <SettingsField label="Site URL" htmlFor="site-url" description="e.g. https://app.example.com">
          <Input
            id="site-url"
            value={form.siteUrl}
            onChange={(event) => set("siteUrl", event.target.value)}
            placeholder="https://"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Regional" description="Defaults for time and currency display.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Site Timezone" htmlFor="timezone">
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Default Currency" htmlFor="default-currency">
            <Select value={form.defaultCurrency} onValueChange={(v) => set("defaultCurrency", v)}>
              <SelectTrigger id="default-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Contact & Support" description="Shown to users who need help.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Support Email" htmlFor="support-email">
            <Input
              id="support-email"
              type="email"
              value={form.supportEmail}
              onChange={(event) => set("supportEmail", event.target.value)}
              placeholder="support@example.com"
            />
          </SettingsField>
          <SettingsField label="Support Phone" htmlFor="support-phone">
            <Input
              id="support-phone"
              value={form.supportPhone}
              onChange={(event) => set("supportPhone", event.target.value)}
              placeholder="+1 555 000 0000"
            />
          </SettingsField>
        </div>
        <SettingsField label="Address" htmlFor="address">
          <Textarea
            id="address"
            rows={2}
            value={form.address}
            onChange={(event) => set("address", event.target.value)}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Email Identity"
        description="The From identity on outgoing mail. SMTP transport is configured in the environment."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SettingsField label="From Name" htmlFor="from-name">
            <Input
              id="from-name"
              value={form.fromName}
              onChange={(event) => set("fromName", event.target.value)}
            />
          </SettingsField>
          <SettingsField label="From Email" htmlFor="from-email">
            <Input
              id="from-email"
              type="email"
              value={form.fromEmail}
              onChange={(event) => set("fromEmail", event.target.value)}
              placeholder="no-reply@example.com"
            />
          </SettingsField>
          <SettingsField label="Reply-To" htmlFor="reply-to">
            <Input
              id="reply-to"
              type="email"
              value={form.replyTo}
              onChange={(event) => set("replyTo", event.target.value)}
            />
          </SettingsField>
        </div>
        <SettingsField label="Footer / Copyright Text" htmlFor="footer-text">
          <Input
            id="footer-text"
            value={form.footerText}
            onChange={(event) => set("footerText", event.target.value)}
            placeholder="© 2026 Rebate Bank. All rights reserved."
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
