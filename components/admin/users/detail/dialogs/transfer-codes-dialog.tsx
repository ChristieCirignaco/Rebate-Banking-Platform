"use client";

import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { ActionIconButton } from "../shared";
import type { TransferCodeGroup, TransferCodes, UserDetail } from "../types";

const GROUPS: { key: TransferCodeGroup; label: string }[] = [
  { key: "imf", label: "IMF" },
  { key: "tax", label: "TAX" },
  { key: "cot", label: "COT" },
];

function CodeGroup({
  label,
  codes,
  onChange,
}: {
  label: string;
  codes: string[];
  onChange: (codes: string[]) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label} Codes</span>
          <Badge variant="secondary">{codes.length}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={codes.length === 0}
          onClick={() => onChange([])}
        >
          Clear All
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {codes.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No codes — this step will be skipped.
          </p>
        ) : null}
        {codes.map((code, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(event) => {
                const next = [...codes];
                next[index] = event.target.value;
                onChange(next);
              }}
              placeholder={`${label} code`}
              className="font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Remove code"
              onClick={() => onChange(codes.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...codes, ""])}
        >
          <Plus className="size-4" />
          Add {label} Code
        </Button>
      </div>
    </div>
  );
}

export function TransferCodesDialog({
  user,
  initialCodes,
  onSave,
}: {
  user: UserDetail;
  initialCodes: TransferCodes;
  onSave: (codes: TransferCodes) => void;
}) {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<TransferCodes>(initialCodes);

  const setGroup = (key: TransferCodeGroup, value: string[]) =>
    setCodes((current) => ({ ...current, [key]: value }));

  function handleSave() {
    onSave(codes);
    toast.success("Transfer codes saved");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton
          icon={KeyRound}
          tint="amber"
          label="Manage Transfer Codes"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Transfer Codes for {user.name}</DialogTitle>
          <DialogDescription>
            Configure verification codes used during transfers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Important
            </p>
            <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-4 text-xs">
              <li>
                Each verification type needs a minimum of 3 codes, or can be
                left empty to skip.
              </li>
              <li>1–2 codes will cause validation errors.</li>
              <li>Clear all fields to disable a verification type.</li>
              <li>Transfer flow: PIN → enabled verifications → OTP.</li>
            </ul>
          </div>

          {GROUPS.map((group) => (
            <CodeGroup
              key={group.key}
              label={group.label}
              codes={codes[group.key]}
              onChange={(value) => setGroup(group.key, value)}
            />
          ))}

          <p className="text-muted-foreground text-xs">
            Transfer verification will use random codes from the lists above. If
            a list is empty, that step is skipped.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Transfer Codes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
