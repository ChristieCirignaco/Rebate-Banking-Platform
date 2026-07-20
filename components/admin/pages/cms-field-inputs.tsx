"use client";

// Schema-driven form fields for CMS component content and repeatable items.
// The field list comes from lib/cms/schemas.ts; server actions re-validate.
import { ImageField } from "@/components/admin/settings/image-field";
import { CmsDocumentField } from "@/components/admin/pages/cms-document-field";
import { RichTextEditor } from "@/components/admin/deposits/rich-text-editor";
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
import { CMS_ICON_NAMES, CmsIcon } from "@/lib/cms/icons";
import type { CmsFieldDef } from "@/lib/cms/types";

const NONE = "__none__";

export type CmsFormValue = Record<string, unknown>;

// Converts stored CMS data into editable form state (lines → newline-joined text).
export function toFormState(fields: CmsFieldDef[], data: Record<string, unknown>): CmsFormValue {
  const out: CmsFormValue = {};
  for (const field of fields) {
    const value = data[field.key];
    out[field.key] =
      field.type === "lines"
        ? Array.isArray(value)
          ? value.join("\n")
          : ""
        : ((value as string | number | undefined) ?? "");
  }
  return out;
}

export function CmsFieldInputs({
  fields,
  value,
  onChange,
  idPrefix,
}: {
  fields: CmsFieldDef[];
  value: CmsFormValue;
  onChange: (key: string, next: unknown) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const raw = value[field.key];
        const text = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
        const label = (
          <Label htmlFor={id}>
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>
        );
        const help = field.help ? (
          <p className="text-muted-foreground text-xs">{field.help}</p>
        ) : null;

        switch (field.type) {
          case "textarea":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Textarea
                  id={id}
                  value={text}
                  rows={4}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
                {help}
              </div>
            );
          case "lines":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Textarea
                  id={id}
                  value={text}
                  rows={5}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
                <p className="text-muted-foreground text-xs">One item per line.</p>
              </div>
            );
          case "richtext":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <RichTextEditor
                  defaultValue={text}
                  onChange={(html) => onChange(field.key, html)}
                  ariaLabel={field.label}
                />
                {help}
              </div>
            );
          case "image":
            return (
              <div key={field.key} className="flex flex-col gap-1">
                <ImageField
                  label={field.label}
                  value={text || null}
                  onChange={(url) => onChange(field.key, url ?? "")}
                  description={field.help}
                />
              </div>
            );
          case "file":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <CmsDocumentField
                  id={id}
                  label={field.label}
                  value={text}
                  onChange={(url) => onChange(field.key, url)}
                  help={field.help}
                />
              </div>
            );
          case "number":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Input
                  id={id}
                  type="number"
                  step="any"
                  value={text}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
                {help}
              </div>
            );
          case "icon":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Select
                  value={text || NONE}
                  onValueChange={(v) => onChange(field.key, v === NONE ? "" : v)}
                >
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Choose an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Always present so an empty value shows a label instead of a
                        blank trigger; required fields are enforced on save. */}
                    <SelectItem value={NONE}>
                      {field.required ? "Choose an icon" : "No icon"}
                    </SelectItem>
                    {CMS_ICON_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <CmsIcon name={name} className="size-4" />
                          {name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {help}
              </div>
            );
          case "select":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Select
                  value={text || NONE}
                  onValueChange={(v) => onChange(field.key, v === NONE ? "" : v)}
                >
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={`Choose ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{field.required ? "Choose…" : "None"}</SelectItem>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {help}
              </div>
            );
          default:
            // text / accent / url / video
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {label}
                <Input id={id} value={text} onChange={(e) => onChange(field.key, e.target.value)} />
                {help}
              </div>
            );
        }
      })}
    </div>
  );
}
