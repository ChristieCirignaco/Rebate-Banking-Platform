"use client";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";

// Sticky action bar at the bottom of each settings form.
export function SettingsSaveBar({
  onSave,
  saving,
  disabled,
}: {
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="bg-background/80 sticky bottom-0 z-10 flex justify-end gap-2 rounded-lg border p-3 backdrop-blur">
      <Button type="button" onClick={onSave} disabled={saving || disabled}>
        <Save className="size-4" />
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
