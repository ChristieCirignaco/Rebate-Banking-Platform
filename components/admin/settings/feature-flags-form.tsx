"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setFeatureFlag } from "@/app/admin/settings/actions";
import { toast } from "@/lib/toast";
import type { FeatureFlagView } from "@/lib/settings/feature-flags";
import { SettingsSection, SettingsToggle } from "./settings-ui";

// Flags save immediately on toggle (optimistic, revert on error) — the same UX as the
// per-user controls panel. Enforcement guards are wired per-surface in a later pass; here
// we persist the switch.
export function FeatureFlagsForm({ initial }: { initial: FeatureFlagView[] }) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: string, next: boolean) {
    setPendingKey(key);
    setFlags((current) =>
      current.map((flag) => (flag.key === key ? { ...flag, enabled: next } : flag)),
    );
    startTransition(async () => {
      const result = await setFeatureFlag(key, next);
      if (result.ok) {
        toast.success(`${labelFor(key)} ${next ? "enabled" : "disabled"}.`);
        router.refresh();
      } else {
        setFlags((current) =>
          current.map((flag) => (flag.key === key ? { ...flag, enabled: !next } : flag)),
        );
        toast.error(result.error);
      }
      setPendingKey(null);
    });
  }

  function labelFor(key: string) {
    return flags.find((flag) => flag.key === key)?.label ?? "Feature";
  }

  const userFlags = flags.filter((flag) => flag.side === "user");
  const adminFlags = flags.filter((flag) => flag.side === "admin");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Turn platform capabilities on or off. Disabled features are hidden and rejected
        server-side once enforcement is wired for each surface.
      </p>

      <SettingsSection
        title="User-facing"
        description="Capabilities available to end users."
      >
        <div className="flex flex-col gap-2">
          {userFlags.map((flag) => (
            <SettingsToggle
              key={flag.key}
              id={`flag-${flag.key}`}
              label={flag.label}
              description={flag.description}
              checked={flag.enabled}
              disabled={pendingKey === flag.key}
              onCheckedChange={(next) => toggle(flag.key, next)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Admin & Platform" description="Site-wide operational switches.">
        <div className="flex flex-col gap-2">
          {adminFlags.map((flag) => (
            <SettingsToggle
              key={flag.key}
              id={`flag-${flag.key}`}
              label={flag.label}
              description={flag.description}
              checked={flag.enabled}
              disabled={pendingKey === flag.key}
              onCheckedChange={(next) => toggle(flag.key, next)}
            />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
