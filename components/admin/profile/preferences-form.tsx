"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { updateAdminPreferences } from "@/app/admin/profile/actions";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A small, common set — the app stores a free-form BCP-47 tag, so this just covers the usual
// choices without shipping the full CLDR list.
const LOCALES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
] as const;

export type PreferencesInitial = { timezone: string; locale: string; currency: string };

export function PreferencesForm({
  initial,
  timezones,
  currencies,
}: {
  initial: PreferencesInitial;
  timezones: string[];
  currencies: { code: string; name: string }[];
}) {
  const [timezone, setTimezone] = useState(initial.timezone);
  const [locale, setLocale] = useState(initial.locale);
  const [currency, setCurrency] = useState(initial.currency);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!timezone) {
      toast.error("Please select a timezone.");
      return;
    }
    if (!currency) {
      toast.error("Please select a currency.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateAdminPreferences({ timezone, locale, currency });
      if (result.ok) toast.success("Preferences saved");
      else toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Your timezone, language, and preferred currency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone" className="text-sm font-semibold">
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="locale" className="text-sm font-semibold">
                Language
              </Label>
              <Select value={locale} onValueChange={setLocale} disabled={saving}>
                <SelectTrigger id="locale" className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:max-w-[calc(50%-0.5rem)]">
            <Label htmlFor="currency" className="text-sm font-semibold">
              Preferred Currency
            </Label>
            <Select value={currency} onValueChange={setCurrency} disabled={saving}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
