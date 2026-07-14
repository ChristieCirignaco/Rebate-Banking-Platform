"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";

import { updateWithdrawSchedule } from "@/app/admin/withdrawals/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import type { WithdrawScheduleDay } from "./types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function WithdrawScheduleTab({
  schedule,
}: {
  schedule: WithdrawScheduleDay[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<WithdrawScheduleDay[]>(schedule);
  const [pending, setPending] = useState(false);

  function toggle(day: number, enabled: boolean) {
    setDays((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, enabled } : entry)),
    );
  }

  async function save() {
    setPending(true);
    try {
      const result = await updateWithdrawSchedule(days);
      if (result.ok) {
        toast.success("Schedule updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-start gap-3 border-blue-500/20 bg-blue-500/5 p-4">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm">
          <p className="font-medium">Withdraw Schedule</p>
          <p className="text-muted-foreground">
            Set a weekly schedule so the system auto-processes withdrawals on the days you
            enable. For example, enabling <span className="font-medium">Monday</span> means
            pending withdrawals are automatically processed every Monday.
          </p>
        </div>
      </Card>

      <Card className="flex flex-col divide-y">
        {days.map((entry) => (
          <div
            key={entry.day}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="font-medium">{DAY_NAMES[entry.day]}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {entry.enabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={entry.enabled}
                onCheckedChange={(checked) => toggle(entry.day, checked)}
                aria-label={`Auto-process on ${DAY_NAMES[entry.day]}`}
              />
            </div>
          </div>
        ))}
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Update Schedule"}
        </Button>
      </div>
    </div>
  );
}
