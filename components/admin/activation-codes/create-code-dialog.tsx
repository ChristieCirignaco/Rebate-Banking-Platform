"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { createActivationCodeEntry } from "@/app/admin/activation-codes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import type { ActivationCodeStatus } from "./types";

// Mirrors the existing quick-generate action's RB-XXXXXXXX format (app/admin/users/actions.ts),
// generated client-side here so it only fills the input — the row itself is created once on
// submit, whether the code was typed manually or generated.
function generateCode(): string {
  return `RB-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function CreateCodeDialog({
  children,
  onCreated,
}: {
  children: React.ReactNode;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ActivationCodeStatus>("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setCode("");
      setStatus("active");
      setNotes("");
    }
  }

  async function submit() {
    if (!code.trim()) {
      toast.error("Enter or generate a code.");
      return;
    }
    setSaving(true);
    try {
      const result = await createActivationCodeEntry({
        code: code.trim(),
        status,
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        toast.success(`Activation code created: ${result.code}`);
        setOpen(false);
        onCreated();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Activation Code</DialogTitle>
          <DialogDescription>
            Type your own code, or generate a system-format one below.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activation-code-input">Activation Code</Label>
            <div className="flex gap-2">
              <Input
                id="activation-code-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g., ABC123"
                maxLength={40}
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={() => setCode(generateCode())}>
                <Sparkles className="size-4" />
                Generate Code
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activation-code-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ActivationCodeStatus)}
            >
              <SelectTrigger id="activation-code-status" className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activation-code-notes">Admin Notes</Label>
            <Textarea
              id="activation-code-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional — visible only to admins."
              maxLength={500}
            />
          </div>

          <div className="bg-muted/40 rounded-lg border p-3 text-sm">
            <p className="mb-1 font-medium">How it works</p>
            <ul className="text-muted-foreground list-disc space-y-1 pl-4">
              <li>Users can enter this code during registration.</li>
              <li>You can track usage in the Activation Codes page.</li>
              <li>Suspended codes cannot be used by new users.</li>
              <li>Codes can be used unlimited times unless suspended.</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create Activation Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
