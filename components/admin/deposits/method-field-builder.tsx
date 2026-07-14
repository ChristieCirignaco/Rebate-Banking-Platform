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
import type { ManualFieldType } from "./types";

export interface FieldRow {
  label: string;
  type: ManualFieldType;
  required: boolean;
}

export const emptyField = (): FieldRow => ({
  label: "",
  type: "input",
  required: true,
});

const TYPE_OPTIONS: { value: ManualFieldType; label: string }[] = [
  { value: "input", label: "Input Text" },
  { value: "textarea", label: "Textarea" },
  { value: "file", label: "File" },
];

// The dynamic custom-field builder: these rows define what the user fills at deposit time
// and what the admin sees in the Manual Requests review modal.
export function MethodFieldBuilder({
  fields,
  onChange,
  label = "User Deposit Fields",
  emptyHint = "No custom fields yet. Add fields the user must fill when depositing (e.g. Sender Name, Transaction Hash).",
}: {
  fields: FieldRow[];
  onChange: (fields: FieldRow[]) => void;
  label?: string;
  emptyHint?: string;
}) {
  function update(index: number, patch: Partial<FieldRow>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }
  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...fields, emptyField()])}
        >
          <Plus className="size-4" />
          Add New Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          {emptyHint}
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
                placeholder="Field label"
                aria-label={`Field ${index + 1} label`}
              />
              <Select
                value={field.type}
                onValueChange={(value) => update(index, { type: value as ManualFieldType })}
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
