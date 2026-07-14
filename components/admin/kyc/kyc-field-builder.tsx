"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KycFieldType, KycTemplateFieldRow } from "./types";

export const emptyKycField = (): KycTemplateFieldRow => ({
  label: "",
  type: "text",
  required: true,
});

const TYPE_OPTIONS: { value: KycFieldType; label: string }[] = [
  { value: "text", label: "Input Text" },
  { value: "file", label: "File" },
  { value: "number", label: "Number" },
];

// Dynamic field builder for a KYC template. These rows define what a user submits and,
// in turn, what the review/view modals render (File fields become image/PDF previews).
export function KycFieldBuilder({
  fields,
  onChange,
}: {
  fields: KycTemplateFieldRow[];
  onChange: (fields: KycTemplateFieldRow[]) => void;
}) {
  function update(index: number, patch: Partial<KycTemplateFieldRow>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }
  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Fields</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...fields, emptyKycField()])}
        >
          <Plus className="size-4" />
          Add New Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          No fields yet. Add the fields a user must complete for this verification (e.g.
          Full Name, ID Number, Document Front).
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_9rem_8rem_auto]"
            >
              <Input
                value={field.label}
                onChange={(event) => update(index, { label: event.target.value })}
                placeholder="Field name"
                aria-label={`Field ${index + 1} name`}
              />
              <Select
                value={field.type}
                onValueChange={(value) => update(index, { type: value as KycFieldType })}
              >
                <SelectTrigger aria-label={`Field ${index + 1} type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={field.required ? "required" : "optional"}
                onValueChange={(value) => update(index, { required: value === "required" })}
              >
                <SelectTrigger aria-label={`Field ${index + 1} requirement`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                onClick={() => remove(index)}
                aria-label={`Remove field ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
