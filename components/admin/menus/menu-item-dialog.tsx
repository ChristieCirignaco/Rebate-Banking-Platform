"use client";

import { type ReactNode, useState } from "react";

import { createMenuItem, updateMenuItem } from "@/app/admin/menus/actions";
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
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CmsPageListRow } from "@/lib/admin/cms";
import type { MenuItemRow } from "@/lib/admin/menus";

type LinkType = "page" | "custom";

type MenuItemDialogProps = {
  location: "header" | "footer";
  pages: CmsPageListRow[];
  // The dialog's own trigger — a button, icon button, etc. Lets each call site (the panel's
  // "Add item" button, a row's edit button) supply its own trigger UI.
  children: ReactNode;
} & ({ mode: "create"; item?: undefined } | { mode: "edit"; item: MenuItemRow });

// Add/edit dialog for a single header or footer menu item. One dialog instance is mounted per
// trigger (the panel's "Add item" button, or each row's edit button) — mirroring
// components/admin/currencies/currency-form-dialog.tsx and edit-admin-dialog.tsx — so its form
// state can be seeded straight from props in `reset()`, called from the open-change handler
// rather than an effect (this repo's ESLint forbids react-hooks/set-state-in-effect).
//
// Create mode offers a Page | Custom link choice: a page link picks from the CMS page list (its
// URL follows the page's path forever); a custom link takes a free-form label + URL. Edit mode
// can't change which kind an item is — a page-link only exposes label + open-in-new (the URL is
// derived server-side from the linked page), a custom-link exposes label + url + open-in-new.
// This mirrors createMenuItem/updateMenuItem's own invariants in app/admin/menus/actions.ts.
export function MenuItemDialog(props: MenuItemDialogProps) {
  const { location, pages, children, mode } = props;
  const item = mode === "edit" ? props.item : null;
  const isPageLink = mode === "edit" ? !!item?.page : undefined;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>(isPageLink === false ? "custom" : "page");
  const [pageId, setPageId] = useState(item?.page?.id ?? pages[0]?.id ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [openInNew, setOpenInNew] = useState(item?.openInNew ?? false);

  function reset() {
    if (mode === "edit" && item) {
      setLinkType(item.page ? "page" : "custom");
      setPageId(item.page?.id ?? "");
      setLabel(item.label ?? "");
      setUrl(item.url ?? "");
      setOpenInNew(item.openInNew);
    } else {
      setLinkType("page");
      setPageId(pages[0]?.id ?? "");
      setLabel("");
      setUrl("");
      setOpenInNew(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (next) reset();
  }

  const isPage = mode === "create" ? linkType === "page" : !!isPageLink;

  const canSubmit =
    mode === "create"
      ? isPage
        ? !!pageId
        : label.trim().length > 0 && url.trim().length > 0
      : isPage || url.trim().length > 0;

  async function submit() {
    if (busy || !canSubmit) return;
    setBusy(true);
    try {
      const result =
        mode === "create"
          ? await createMenuItem({
              location,
              pageId: isPage ? pageId : undefined,
              url: isPage ? undefined : url.trim(),
              label: label.trim() || undefined,
              openInNew,
            })
          : await updateMenuItem(item!.id, {
              label: label.trim(),
              openInNew,
              ...(isPage ? {} : { url: url.trim() }),
            });
      if (result.ok) {
        toast.success(mode === "create" ? "Menu item added" : "Menu item saved");
        window.location.reload();
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add menu item" : "Edit menu item"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Link to an existing page, or add a custom label and URL."
              : isPage
                ? "This item links to a page — its address follows the page automatically."
                : "Update the label, link, and how it opens."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode === "create" && (
            <ToggleGroup
              type="single"
              variant="outline"
              value={linkType}
              onValueChange={(value) => value && setLinkType(value as LinkType)}
              className="w-full"
            >
              <ToggleGroupItem value="page" className="flex-1">
                Page
              </ToggleGroupItem>
              <ToggleGroupItem value="custom" className="flex-1">
                Custom link
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {isPage && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="menu-item-page">Page</Label>
              {mode === "create" ? (
                <Select value={pageId} onValueChange={setPageId}>
                  <SelectTrigger id="menu-item-page" className="w-full">
                    <SelectValue placeholder="Choose a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} ({p.path})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="menu-item-page"
                  value={item?.page ? `${item.page.title} (${item.page.path})` : ""}
                  disabled
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="menu-item-label">Label{!isPage ? "" : " (optional)"}</Label>
            <Input
              id="menu-item-label"
              value={label}
              placeholder={isPage ? "Defaults to the page title" : "e.g. Contact us"}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {!isPage && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="menu-item-url">URL</Label>
              <Input
                id="menu-item-url"
                value={url}
                placeholder="/about or https://example.com"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="menu-item-open-new" className="font-normal">
              Open in new tab
            </Label>
            <Switch id="menu-item-open-new" checked={openInNew} onCheckedChange={setOpenInNew} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !canSubmit}>
            {busy ? "Saving…" : mode === "create" ? "Add item" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
