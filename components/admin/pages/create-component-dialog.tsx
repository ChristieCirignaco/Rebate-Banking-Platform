"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { createCmsComponent } from "@/app/admin/pages/components/actions";
import { CREATABLE_SCHEMAS } from "@/lib/cms/schemas";
import { toast } from "@/lib/toast";
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

export function CreateComponentDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [schemaKey, setSchemaKey] = useState("richtext");

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createCmsComponent({ name, schemaKey });
      if (result.ok) {
        toast.success("Component created — add its content");
        // Full navigation: router.push after a server action wedges the router.
        window.location.href = `/admin/pages/components/${result.id}`;
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName("");
          setSchemaKey("richtext");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Page Component</DialogTitle>
          <DialogDescription>
            A reusable section you can place on any page. &ldquo;Rich Text&rdquo; gives a free-form
            editor; the other types come with a ready-made layout.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cms-component-name">Component name</Label>
            <Input
              id="cms-component-name"
              value={name}
              placeholder="e.g. Terms & Conditions"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cms-component-schema">Component type</Label>
            <Select value={schemaKey} onValueChange={setSchemaKey}>
              <SelectTrigger id="cms-component-schema" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_SCHEMAS.map((schema) => (
                  <SelectItem key={schema.key} value={schema.key}>
                    {schema.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create Component"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
