"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import {
  payReferralEarning,
  rejectReferralEarning,
  saveReferralSettings,
} from "@/app/admin/referrals/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ReferralSettings } from "@/lib/settings/defs";
import { toast } from "@/lib/toast";
import type { AdminReferralEarning, AdminReferralStatus } from "./types";

const STATUS_VARIANT: Record<AdminReferralStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  rejected: "destructive",
};

const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none";

function SettingsForm({ settings }: { settings: ReferralSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<ReferralSettings>(settings);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const res = await saveReferralSettings({ ...form, rewardAmount: Number(form.rewardAmount) });
      if (res.ok) {
        toast.success("Referral settings saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">Reward configuration</h3>
        <p className="text-muted-foreground text-xs">
          How and when referrers earn. Percentage rewards apply to the referred user&apos;s first
          deposit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Trigger</Label>
          <select
            value={form.trigger}
            onChange={(e) => set("trigger", e.target.value as ReferralSettings["trigger"])}
            className={SELECT}
          >
            <option value="first_deposit">On first deposit</option>
            <option value="signup">On signup</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Reward type</Label>
          <select
            value={form.rewardType}
            onChange={(e) => set("rewardType", e.target.value as ReferralSettings["rewardType"])}
            className={SELECT}
          >
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent of first deposit</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            {form.rewardType === "percent" ? "Reward percent (%)" : "Reward amount"}
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.rewardAmount}
            onChange={(e) => set("rewardAmount", Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Reward currency {form.rewardType === "percent" ? "(fixed only)" : ""}</Label>
          <Input
            value={form.rewardCurrency}
            onChange={(e) => set("rewardCurrency", e.target.value.toUpperCase())}
            maxLength={8}
            disabled={form.rewardType === "percent"}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Allowed rules (one per line)</Label>
          <Textarea
            rows={4}
            value={form.allowedRules}
            onChange={(e) => set("allowedRules", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Prohibited rules (one per line)</Label>
          <Textarea
            rows={4}
            value={form.prohibitedRules}
            onChange={(e) => set("prohibitedRules", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </Card>
  );
}

function EarningsTable({ earnings }: { earnings: AdminReferralEarning[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function act(id: string, action: "pay" | "reject") {
    setPending(id);
    try {
      const res = action === "pay" ? await payReferralEarning(id) : await rejectReferralEarning(id);
      if (res.ok) {
        toast.success(action === "pay" ? "Reward paid — wallet credited" : "Earning rejected");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setPending(null);
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referrer</TableHead>
            <TableHead>Referred</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Earned</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                No referral earnings yet.
              </TableCell>
            </TableRow>
          ) : (
            earnings.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{e.referrerName}</span>
                    <span className="text-muted-foreground text-xs">{e.referrerEmail}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{e.referredName}</TableCell>
                <TableCell className="text-sm font-medium tabular-nums">{e.amountLabel}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {e.trigger === "first_deposit" ? "First deposit" : "Signup"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{e.createdAtLabel}</TableCell>
                <TableCell className="text-right">
                  {e.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending === e.id}
                        onClick={() => act(e.id, "reject")}
                      >
                        <X className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending === e.id}
                        onClick={() => act(e.id, "pay")}
                        className="bg-emerald-700 text-white hover:bg-emerald-700/90"
                      >
                        <Check className="size-4" />
                        Pay
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {e.reviewedByName ?? "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export function ReferralsAdminView({
  settings,
  earnings,
}: {
  settings: ReferralSettings;
  earnings: AdminReferralEarning[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsForm settings={settings} />
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Referral earnings</h3>
        <EarningsTable earnings={earnings} />
      </div>
    </div>
  );
}
