"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { createCmsPage } from "@/app/admin/pages/actions";
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
import { Switch } from "@/components/ui/switch";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// Gentler live normalization for the slug input: keeps a trailing "-" so
// multi-word slugs can actually be typed (the server normalizes again on save).
function slugWhileTyping(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 64);
}

export function CreatePageDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [addToHeader, setAddToHeader] = useState(false);
  const [addToFooter, setAddToFooter] = useState(false);

  function reset() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setBreadcrumb("");
    setIsActive(true);
    setAddToHeader(false);
    setAddToFooter(false);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createCmsPage({
        title,
        slug,
        breadcrumb,
        isActive,
        addToHeader,
        addToFooter,
      });
      if (result.ok) {
        toast.success("Page created — now add components to it");
        // Full navigation: router.push after a server action wedges the router.
        window.location.href = `/admin/pages/${result.id}`;
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
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Create Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
          <DialogDescription>
            The page goes live at its path once activated. Compose its sections on the next
            screen.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cms-page-title">Page title</Label>
            <Input
              id="cms-page-title"
              value={title}
              placeholder="e.g. Terms & Conditions"
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cms-page-slug">Page slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/</span>
              <Input
                id="cms-page-slug"
                value={slug}
                placeholder="terms-and-conditions"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugWhileTyping(e.target.value));
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cms-page-breadcrumb">Breadcrumb label (optional)</Label>
            <Input
              id="cms-page-breadcrumb"
              value={breadcrumb}
              placeholder="Shows a hero banner with Home > label when set"
              onChange={(e) => setBreadcrumb(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="cms-page-active" className="font-normal">
              Page status — {isActive ? "active" : "inactive"}
            </Label>
            <Switch id="cms-page-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="cms-page-add-header" className="font-normal">
              Add to header menu
            </Label>
            <Switch
              id="cms-page-add-header"
              checked={addToHeader}
              onCheckedChange={setAddToHeader}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="cms-page-add-footer" className="font-normal">
              Add to footer menu
            </Label>
            <Switch
              id="cms-page-add-footer"
              checked={addToFooter}
              onCheckedChange={setAddToFooter}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "Creating…" : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
