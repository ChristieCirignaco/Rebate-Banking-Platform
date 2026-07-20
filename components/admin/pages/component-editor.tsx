"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createCmsComponentItem,
  deleteCmsComponentItem,
  moveCmsComponentItem,
  renameCmsComponent,
  toggleCmsComponentActive,
  updateCmsComponentContent,
  updateCmsComponentItem,
  type ActionResult,
} from "@/app/admin/pages/components/actions";
import { getCmsSchema } from "@/lib/cms/schemas";
import type { CmsCollectionDef } from "@/lib/cms/types";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CmsFieldInputs, toFormState, type CmsFormValue } from "./cms-field-inputs";
import type { CmsComponentDetailData, CmsItemRow } from "@/lib/admin/cms";

function itemLabel(item: CmsItemRow, def: CmsCollectionDef): string {
  const raw = item.data[def.itemLabelField];
  const label = typeof raw === "string" ? raw.replace(/\[\[|\]\]/g, "") : "";
  return label || "(untitled)";
}

type ItemDialogState =
  | { mode: "create"; collection: CmsCollectionDef }
  | { mode: "edit"; collection: CmsCollectionDef; item: CmsItemRow }
  | null;

export function ComponentEditor({ component }: { component: CmsComponentDetailData }) {
  const router = useRouter();
  const schema = getCmsSchema(component.schemaKey);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(component.name);
  const [isActive, setIsActive] = useState(component.isActive);
  const [form, setForm] = useState<CmsFormValue>(() =>
    toFormState(schema?.fields ?? [], component.content),
  );
  const [itemDialog, setItemDialog] = useState<ItemDialogState>(null);
  const [itemForm, setItemForm] = useState<CmsFormValue>({});
  const [deleteItem, setDeleteItem] = useState<{ item: CmsItemRow; def: CmsCollectionDef } | null>(
    null,
  );

  async function run(action: Promise<ActionResult>, successMessage: string): Promise<boolean> {
    setBusy(true);
    try {
      const result = await action;
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
        return true;
      }
      toast.error(result.error);
      return false;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onToggleActive(value: boolean) {
    setIsActive(value);
    const result = await toggleCmsComponentActive(component.id, value);
    if (result.ok) {
      toast.success(`${component.name} ${value ? "activated" : "deactivated"}`);
      router.refresh();
    } else {
      setIsActive(!value);
      toast.error(result.error);
    }
  }

  function openItemDialog(state: NonNullable<ItemDialogState>) {
    setItemForm(
      state.mode === "edit"
        ? toFormState(state.collection.fields, state.item.data)
        : toFormState(state.collection.fields, {}),
    );
    setItemDialog(state);
  }

  async function saveItem() {
    if (!itemDialog) return;
    const ok = await run(
      itemDialog.mode === "create"
        ? createCmsComponentItem(component.id, itemDialog.collection.key, itemForm)
        : updateCmsComponentItem(itemDialog.item.id, itemForm),
      itemDialog.mode === "create" ? "Item added" : "Item saved",
    );
    if (ok) setItemDialog(null);
  }

  async function confirmDeleteItem() {
    if (!deleteItem) return;
    const ok = await run(deleteCmsComponentItem(deleteItem.item.id), "Item deleted");
    if (ok) setDeleteItem(null);
  }

  if (!schema) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          This component&apos;s schema ({component.schemaKey}) is not registered.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Meta */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex min-w-56 flex-1 flex-col gap-2">
              <Label htmlFor="cms-component-rename">Component name</Label>
              <Input
                id="cms-component-rename"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || name.trim() === component.name}
              onClick={() => run(renameCmsComponent(component.id, name), "Component renamed")}
            >
              Rename
            </Button>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Label htmlFor="cms-component-active" className="font-normal">
                {isActive ? "Active" : "Inactive"}
              </Label>
              <Switch
                id="cms-component-active"
                checked={isActive}
                onCheckedChange={onToggleActive}
                disabled={component.isGlobal}
              />
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{schema.label}</Badge>
            {component.type === "dynamic" && <Badge variant="secondary">Rich text</Badge>}
            {component.isGlobal && <Badge variant="secondary">Site chrome — all pages</Badge>}
            {component.isProtected && <Badge variant="outline">Protected</Badge>}
            {component.usedOn.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                Used on:
                {component.usedOn.map((page) => (
                  <Link
                    key={page.id}
                    href={`/admin/pages/${page.id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {page.title}
                  </Link>
                ))}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fixed fields */}
      {schema.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CmsFieldInputs
              fields={schema.fields}
              value={form}
              onChange={(key, next) => setForm((current) => ({ ...current, [key]: next }))}
              idPrefix="cms-content"
            />
            <div>
              <Button
                disabled={busy}
                onClick={() =>
                  run(updateCmsComponentContent(component.id, form), "Content saved")
                }
              >
                Save content
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repeatable collections */}
      {(schema.collections ?? []).map((def) => {
        const items = component.collections[def.key] ?? [];
        return (
          <Card key={def.key}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{def.label}</CardTitle>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => openItemDialog({ mode: "create", collection: def })}
              >
                <Plus className="size-4" />
                Add Content
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <p className="text-muted-foreground px-6 pb-6 text-sm">
                  No entries yet — add the first one.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">#</TableHead>
                        <TableHead>{def.fields.find((f) => f.key === def.itemLabelField)?.label ?? "Item"}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="max-w-md truncate font-medium">
                            {itemLabel(item, def)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busy || index === 0}
                                onClick={() => run(moveCmsComponentItem(item.id, "up"), "Order updated")}
                                aria-label="Move up"
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busy || index === items.length - 1}
                                onClick={() => run(moveCmsComponentItem(item.id, "down"), "Order updated")}
                                aria-label="Move down"
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busy}
                                onClick={() => openItemDialog({ mode: "edit", collection: def, item })}
                                aria-label="Edit item"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive size-8"
                                disabled={busy}
                                onClick={() => setDeleteItem({ item, def })}
                                aria-label="Delete item"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit item dialog */}
      <Dialog open={!!itemDialog} onOpenChange={(open) => !open && setItemDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {itemDialog?.mode === "create" ? "Add" : "Edit"} {itemDialog?.collection.label}
            </DialogTitle>
          </DialogHeader>
          {itemDialog && (
            <CmsFieldInputs
              fields={itemDialog.collection.fields}
              value={itemForm}
              onChange={(key, next) => setItemForm((current) => ({ ...current, [key]: next }))}
              idPrefix="cms-item"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={saveItem} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete item confirm */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteItem ? itemLabel(deleteItem.item, deleteItem.def) : ""}&rdquo; will be
              removed everywhere this component appears.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteItem} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
