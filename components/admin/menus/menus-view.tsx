"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteMenuItem, reorderMenu, toggleMenuItemActive } from "@/app/admin/menus/actions";
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
import { Switch } from "@/components/ui/switch";
import { MenuItemDialog } from "@/components/admin/menus/menu-item-dialog";
import type { MenuItemRow, MenuManagerData } from "@/lib/admin/menus";

type Location = "header" | "footer";

function itemLabel(item: MenuItemRow): string {
  return item.label?.trim() || item.page?.title || item.url || "(untitled)";
}

function itemHref(item: MenuItemRow): string {
  return item.page?.path ?? item.url ?? "";
}

function SortableMenuRow({
  item,
  location,
  pages,
  busy,
  onToggle,
  onDelete,
}: {
  item: MenuItemRow;
  location: Location;
  pages: MenuManagerData["pages"];
  busy: boolean;
  onToggle: (item: MenuItemRow, value: boolean) => void;
  onDelete: (item: MenuItemRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-card flex items-center gap-2 rounded-lg border px-2 py-2 ${
        isDragging ? "z-10 opacity-80 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none p-1 active:cursor-grabbing"
        aria-label={`Reorder ${itemLabel(item)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{itemLabel(item)}</span>
          <Badge variant="outline" className="text-[10px]">
            {item.page ? "Page" : "Custom"}
          </Badge>
          {item.page && !item.page.isActive && (
            <Badge variant="outline" className="text-[10px]">
              Page inactive
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs">{itemHref(item)}</div>
      </div>
      <Switch
        checked={item.isActive}
        onCheckedChange={(value) => onToggle(item, value)}
        disabled={busy}
        aria-label={`${itemLabel(item)} visible in menu`}
      />
      <MenuItemDialog mode="edit" item={item} location={location} pages={pages}>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={busy}
          aria-label={`Edit ${itemLabel(item)}`}
        >
          <Pencil className="size-4" />
        </Button>
      </MenuItemDialog>
      <Button
        size="icon"
        variant="ghost"
        className="text-destructive size-8"
        disabled={busy}
        onClick={() => onDelete(item)}
        aria-label={`Delete ${itemLabel(item)}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function MenuPanel({
  location,
  title,
  items,
  pages,
}: {
  location: Location;
  title: string;
  items: MenuItemRow[];
  pages: MenuManagerData["pages"];
}) {
  // `items` only ever changes via a fresh server render (every mutation below hard-reloads the
  // page), so seeding state once from props is enough — no sync effect needed.
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next); // optimistic
    const result = await reorderMenu(location, next.map((r) => r.id));
    if (result.ok) {
      toast.success(`${title} order saved`);
    } else {
      toast.error(result.error);
    }
    // Hard nav after a Server Action either way — the optimistic order needs the true
    // server state to reconcile it, and this is the documented repo convention.
    window.location.reload();
  }

  async function onToggle(item: MenuItemRow, value: boolean) {
    setBusy(true);
    const result = await toggleMenuItemActive(item.id, value);
    if (result.ok) {
      toast.success(`${itemLabel(item)} ${value ? "shown" : "hidden"}`);
      window.location.reload();
      return;
    }
    toast.error(result.error);
    setBusy(false);
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteMenuItem(deleteTarget.id);
    if (result.ok) {
      toast.success(`${itemLabel(deleteTarget)} removed`);
      window.location.reload();
      return;
    }
    toast.error(result.error);
    setBusy(false);
    setDeleteTarget(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <MenuItemDialog mode="create" location={location} pages={pages}>
          <Button size="sm" disabled={busy}>
            <Plus className="size-4" />
            Add item
          </Button>
        </MenuItemDialog>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
            No items yet — add a page or a custom link.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rows.map((item) => (
                  <SortableMenuRow
                    key={item.id}
                    item={item}
                    location={location}
                    pages={pages}
                    busy={busy}
                    onToggle={onToggle}
                    onDelete={(target) => setDeleteTarget(target)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          Drag to reorder — the {title.toLowerCase()} renders items in this order.
        </p>
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this item?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? itemLabel(deleteTarget) : ""} will be removed from the{" "}
              {title.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={busy}>
              {busy ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function MenusView({ data }: { data: MenuManagerData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <MenuPanel location="header" title="Header" items={data.header} pages={data.pages} />
      <MenuPanel location="footer" title="Footer" items={data.footer} pages={data.pages} />
    </div>
  );
}
