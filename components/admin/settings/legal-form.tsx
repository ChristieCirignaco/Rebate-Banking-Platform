"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateLegalSettings } from "@/app/admin/settings/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import type { LegalSettings } from "@/lib/settings/defs";
import { SettingsField, SettingsSection } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

export function LegalForm({ initial }: { initial: LegalSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof LegalSettings>(key: K, value: LegalSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateLegalSettings(form);
      if (result.ok) {
        toast.success("Legal & social saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Legal Pages"
        description="Links or full content for your Terms and Privacy pages."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Terms URL" htmlFor="terms-url">
            <Input
              id="terms-url"
              value={form.termsUrl}
              onChange={(event) => set("termsUrl", event.target.value)}
              placeholder="https://"
            />
          </SettingsField>
          <SettingsField label="Privacy URL" htmlFor="privacy-url">
            <Input
              id="privacy-url"
              value={form.privacyUrl}
              onChange={(event) => set("privacyUrl", event.target.value)}
              placeholder="https://"
            />
          </SettingsField>
        </div>
        <SettingsField
          label="Terms Content"
          htmlFor="terms-content"
          description="Optional — used if you render terms in-app instead of linking out."
        >
          <Textarea
            id="terms-content"
            rows={4}
            value={form.termsContent}
            onChange={(event) => set("termsContent", event.target.value)}
          />
        </SettingsField>
        <SettingsField label="Privacy Content" htmlFor="privacy-content">
          <Textarea
            id="privacy-content"
            rows={4}
            value={form.privacyContent}
            onChange={(event) => set("privacyContent", event.target.value)}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Social Links" description="Shown in the site footer.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Facebook" htmlFor="social-facebook">
            <Input
              id="social-facebook"
              value={form.socialFacebook}
              onChange={(event) => set("socialFacebook", event.target.value)}
              placeholder="https://facebook.com/"
            />
          </SettingsField>
          <SettingsField label="X / Twitter" htmlFor="social-x">
            <Input
              id="social-x"
              value={form.socialX}
              onChange={(event) => set("socialX", event.target.value)}
              placeholder="https://x.com/"
            />
          </SettingsField>
          <SettingsField label="Instagram" htmlFor="social-instagram">
            <Input
              id="social-instagram"
              value={form.socialInstagram}
              onChange={(event) => set("socialInstagram", event.target.value)}
              placeholder="https://instagram.com/"
            />
          </SettingsField>
          <SettingsField label="LinkedIn" htmlFor="social-linkedin">
            <Input
              id="social-linkedin"
              value={form.socialLinkedin}
              onChange={(event) => set("socialLinkedin", event.target.value)}
              placeholder="https://linkedin.com/"
            />
          </SettingsField>
          <SettingsField label="YouTube" htmlFor="social-youtube">
            <Input
              id="social-youtube"
              value={form.socialYoutube}
              onChange={(event) => set("socialYoutube", event.target.value)}
              placeholder="https://youtube.com/"
            />
          </SettingsField>
          <SettingsField label="TikTok" htmlFor="social-tiktok">
            <Input
              id="social-tiktok"
              value={form.socialTiktok}
              onChange={(event) => set("socialTiktok", event.target.value)}
              placeholder="https://tiktok.com/"
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
