"use client";

import { Lock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { ControlKey, UserControl } from "./types";

// The list scrolls independently (fixed max-height + overflow-y-auto), not the page.
export function UserControls({
  controls,
  onToggle,
}: {
  controls: UserControl[];
  onToggle: (key: ControlKey, value: boolean) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Lock className="text-muted-foreground size-4" />
        <span className="font-semibold">User Controls</span>
      </div>
      <div className="max-h-80 divide-y overflow-y-auto">
        {controls.map((control) => (
          <div
            key={control.key}
            className="flex items-start justify-between gap-3 px-6 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{control.label}</p>
              <p className="text-muted-foreground text-xs">
                {control.description}
              </p>
            </div>
            <Switch
              checked={control.enabled}
              onCheckedChange={(value) => onToggle(control.key, value)}
              aria-label={`Toggle ${control.label}`}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
