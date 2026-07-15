"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateBrandingSettings } from "@/app/admin/settings/actions";
import { toast } from "@/lib/toast";
import type { BrandingSettings } from "@/lib/settings/defs";
import { ImageField } from "./image-field";
import { SettingsSection } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

export function BrandingForm({ initial }: { initial: BrandingSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateBrandingSettings(form);
      if (result.ok) {
        toast.success("Branding saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Logos"
        description="Shown across the app. Provide a dark-mode variant so the logo stays legible on dark backgrounds."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageField
            label="Logo (Light)"
            value={form.logoLight}
            onChange={(v) => set("logoLight", v)}
          />
          <ImageField
            label="Logo (Dark)"
            value={form.logoDark}
            onChange={(v) => set("logoDark", v)}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Favicon & Social"
        description="The browser-tab icon and the image used when the site is shared."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageField
            label="Favicon"
            value={form.favicon}
            onChange={(v) => set("favicon", v)}
          />
          <ImageField
            label="Social Share Image (OG)"
            value={form.ogImage}
            onChange={(v) => set("ogImage", v)}
          />
        </div>
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
