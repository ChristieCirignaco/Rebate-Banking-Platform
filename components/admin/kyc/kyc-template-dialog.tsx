"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createKycTemplate, updateKycTemplate } from "@/app/admin/kyc/actions";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { KycFieldBuilder, emptyKycField } from "./kyc-field-builder";
import type {
  KycTemplateFieldRow,
  KycTemplatePayload,
  KycTemplateSummary,
} from "./types";

export function KycTemplateDialog({
  template,
  children,
}: {
  template?: KycTemplateSummary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(template);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [fields, setFields] = useState<KycTemplateFieldRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed the form from the template each time it opens.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setTitle(template?.title ?? "");
      setDescription(template?.description ?? "");
      setActive(template ? template.status === "active" : true);
      setFields(template ? template.fields.map((field) => ({ ...field })) : [emptyKycField()]);
    }
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Template title is required.");
      return;
    }
    if (fields.length === 0 || fields.some((field) => !field.label.trim())) {
      toast.error("Add at least one field, and give every field a name.");
      return;
    }

    const payload: KycTemplatePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      status: active ? "active" : "inactive",
      fields: fields.map((field) => ({
        label: field.label.trim(),
        type: field.type,
        required: field.required,
      })),
    };

    setSaving(true);
    try {
      const result = isEdit
        ? await updateKycTemplate(template!.id, payload)
        : await createKycTemplate(payload);
      if (result.ok) {
        toast.success(isEdit ? "Template updated" : "Template created");
        setOpen(false);
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
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "Add New Template"}</DialogTitle>
          <DialogDescription>
            Define a verification type and the fields users complete when submitting it.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kyc-template-title">Title</Label>
            <Input
              id="kyc-template-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Government ID Verification"
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kyc-template-description">Description</Label>
            <Textarea
              id="kyc-template-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Shown to the user to explain what this verification requires."
              maxLength={500}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kyc-template-applicable">Applicable To</Label>
            {/* Users only — merchants are unsupported in this project. */}
            <Select value="user" disabled>
              <SelectTrigger id="kyc-template-applicable" className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <KycFieldBuilder fields={fields} onChange={setFields} />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col">
              <Label htmlFor="kyc-template-status">Status</Label>
              <span className="text-muted-foreground text-xs">
                {active ? "Active — available for submissions." : "Inactive — hidden from users."}
              </span>
            </div>
            <Switch id="kyc-template-status" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving
              ? isEdit
                ? "Updating…"
                : "Creating…"
              : isEdit
                ? "Update Template"
                : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
