"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateLimitsSettings } from "@/app/admin/settings/actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import type { KycLevel, LimitsSettings } from "@/lib/settings/defs";
import { SettingsField, SettingsSection, SettingsToggle } from "./settings-ui";
import { SettingsSaveBar } from "./settings-save-bar";

export function LimitsForm({ initial }: { initial: LimitsSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof LimitsSettings>(key: K, value: LimitsSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateLimitsSettings(form);
      if (result.ok) {
        toast.success("Limits & compliance saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        These thresholds are stored now; server-side enforcement (KYC gating, withdrawal caps,
        maker-checker) is wired in a later pass.
      </p>

      <SettingsSection title="KYC & Compliance">
        <SettingsToggle
          id="kyc-required-withdrawal"
          label="Require KYC for withdrawal"
          description="Users must be verified to withdraw."
          checked={form.kycRequiredForWithdrawal}
          onCheckedChange={(checked) => set("kycRequiredForWithdrawal", checked)}
        />
        <SettingsField label="Minimum KYC Level" htmlFor="min-kyc-level">
          <Select
            value={form.minKycLevel}
            onValueChange={(v) => set("minKycLevel", v as KycLevel)}
          >
            <SelectTrigger id="min-kyc-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Withdrawal Limits"
        description="Global defaults; per-currency limits live on the Currencies page."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SettingsField label="Minimum" htmlFor="withdrawal-min" description="0 = no limit">
            <Input
              id="withdrawal-min"
              type="number"
              value={form.withdrawalMin}
              onChange={(event) => set("withdrawalMin", Number(event.target.value) || 0)}
            />
          </SettingsField>
          <SettingsField label="Maximum" htmlFor="withdrawal-max" description="0 = no limit">
            <Input
              id="withdrawal-max"
              type="number"
              value={form.withdrawalMax}
              onChange={(event) => set("withdrawalMax", Number(event.target.value) || 0)}
            />
          </SettingsField>
          <SettingsField
            label="Daily Limit"
            htmlFor="withdrawal-daily-limit"
            description="0 = no limit"
          >
            <Input
              id="withdrawal-daily-limit"
              type="number"
              value={form.withdrawalDailyLimit}
              onChange={(event) => set("withdrawalDailyLimit", Number(event.target.value) || 0)}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Deposit Limits">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Minimum" htmlFor="deposit-min" description="0 = no limit">
            <Input
              id="deposit-min"
              type="number"
              value={form.depositMin}
              onChange={(event) => set("depositMin", Number(event.target.value) || 0)}
            />
          </SettingsField>
          <SettingsField label="Maximum" htmlFor="deposit-max" description="0 = no limit">
            <Input
              id="deposit-max"
              type="number"
              value={form.depositMax}
              onChange={(event) => set("depositMax", Number(event.target.value) || 0)}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Approvals">
        <SettingsField
          label="Maker-Checker Threshold"
          htmlFor="maker-checker-threshold"
          description="Wallet adjustments at or above this amount will require a second admin's approval. 0 = disabled."
        >
          <Input
            id="maker-checker-threshold"
            type="number"
            value={form.makerCheckerThreshold}
            onChange={(event) => set("makerCheckerThreshold", Number(event.target.value) || 0)}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSaveBar onSave={save} saving={isPending} />
    </div>
  );
}
