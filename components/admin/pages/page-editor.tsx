"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ExternalLink, GripVertical, Minus, Plus, Search, Settings, Trash2 } from "lucide-react";

import {
  addPageSection,
  deleteCmsPage,
  removePageSection,
  reorderPageSections,
  setPageInMenu,
  toggleSectionActive,
  updateCmsPageMeta,
  type ActionResult,
} from "@/app/admin/pages/actions";
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
import type { CmsPageDetailData, CmsSectionRow } from "@/lib/admin/cms";

function SortableSectionRow({
  section,
  busy,
  onToggle,
  onRemove,
}: {
  section: CmsSectionRow;
  busy: boolean;
  onToggle: (section: CmsSectionRow, value: boolean) => void;
  onRemove: (section: CmsSectionRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
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
        aria-label={`Reorder ${section.component.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{section.component.name}</span>
          {!section.component.isActive && (
            <Badge variant="outline" className="text-[10px]">
              Component off
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {section.component.schemaLabel}
          {section.component.type === "dynamic" ? " · Rich text" : ""}
        </div>
      </div>
      <Switch
        checked={section.isActive}
        onCheckedChange={(value) => onToggle(section, value)}
        disabled={busy}
        aria-label={`${section.component.name} visible on this page`}
      />
      <Button size="icon" variant="ghost" className="size-8" asChild>
        <Link
          href={`/admin/pages/components/${section.component.id}`}
          aria-label={`Edit ${section.component.name} content`}
        >
          <Settings className="size-4" />
        </Link>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="text-destructive size-8"
        disabled={busy}
        onClick={() => onRemove(section)}
        aria-label={`Remove ${section.component.name} from this page`}
      >
        <Minus className="size-4" />
      </Button>
    </div>
  );
}

export function PageEditor({ page }: { page: CmsPageDetailData }) {
  const router = useRouter();
  const [sections, setSections] = useState(page.sections);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [breadcrumb, setBreadcrumb] = useState(page.breadcrumb ?? "");
  const [isActive, setIsActive] = useState(page.isActive);
  const [inHeaderMenu, setInHeaderMenu] = useState(page.inHeaderMenu);
  const [inFooterMenu, setInFooterMenu] = useState(page.inFooterMenu);
  // Last-saved snapshot: "Save settings" sends only fields that differ from it,
  // so this tab can't clobber changes made elsewhere with stale values.
  const savedMeta = useRef({
    title: page.title,
    slug: page.slug,
    breadcrumb: page.breadcrumb ?? "",
    isActive: page.isActive,
  });

  async function onSaveSettings() {
    const saved = savedMeta.current;
    const patch: Record<string, string | boolean> = {};
    if (title !== saved.title) patch.title = title;
    if (slug !== saved.slug) patch.slug = slug;
    if (breadcrumb !== saved.breadcrumb) patch.breadcrumb = breadcrumb;
    if (isActive !== saved.isActive) patch.isActive = isActive;
    if (Object.keys(patch).length === 0) {
      toast.success("No changes to save");
      return;
    }
    const ok = await run(updateCmsPageMeta(page.id, patch), "Page settings saved");
    if (ok) savedMeta.current = { title, slug, breadcrumb, isActive };
  }

  async function onToggleMenu(location: "header" | "footer", value: boolean) {
    const setter = location === "header" ? setInHeaderMenu : setInFooterMenu;
    setter(value);
    const result = await setPageInMenu(page.id, location, value);
    if (result.ok) {
      toast.success(
        `${page.title} ${value ? "added to" : "removed from"} the ${location} menu`,
      );
      router.refresh();
    } else {
      setter(!value);
      toast.error(result.error);
    }
  }

  // router.refresh() re-renders with fresh server data — mirror it into the
  // local (optimistically updated) list so added/removed sections appear.
  useEffect(() => {
    setSections(page.sections);
  }, [page.sections]);

  // Components added this session, hidden from the library until the refreshed
  // server list arrives (prevents a double-add in the refresh gap).
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setRecentlyAdded(new Set());
  }, [page.library]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const library = useMemo(() => {
    const q = search.trim().toLowerCase();
    const available = page.library.filter((c) => !recentlyAdded.has(c.id));
    if (!q) return available;
    return available.filter(
      (c) => c.name.toLowerCase().includes(q) || c.schemaLabel.toLowerCase().includes(q),
    );
  }, [page.library, search, recentlyAdded]);

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

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next); // optimistic
    const result = await reorderPageSections(
      page.id,
      next.map((s) => s.id),
    );
    if (result.ok) {
      toast.success("Section order saved");
      router.refresh();
    } else {
      setSections(sections);
      toast.error(result.error);
    }
  }

  async function onToggleSection(section: CmsSectionRow, value: boolean) {
    setSections((current) =>
      current.map((s) => (s.id === section.id ? { ...s, isActive: value } : s)),
    );
    const result = await toggleSectionActive(section.id, value);
    if (result.ok) {
      toast.success(`${section.component.name} ${value ? "shown" : "hidden"} on this page`);
      router.refresh();
    } else {
      setSections((current) =>
        current.map((s) => (s.id === section.id ? { ...s, isActive: !value } : s)),
      );
      toast.error(result.error);
    }
  }

  async function onRemoveSection(section: CmsSectionRow) {
    const ok = await run(
      removePageSection(section.id),
      `${section.component.name} removed from this page`,
    );
    if (ok) setSections((current) => current.filter((s) => s.id !== section.id));
  }

  async function onDeletePage() {
    setBusy(true);
    try {
      const result = await deleteCmsPage(page.id);
      if (result.ok) {
        toast.success(`${page.title} deleted`);
        window.location.href = "/admin/pages";
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusy(false);
    setDeleteOpen(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {/* LEFT — component library + page settings */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search components"
                className="pl-8"
                aria-label="Search components"
              />
            </div>
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {library.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  {page.library.length === 0
                    ? "Every component is already on this page."
                    : "No components match your search."}
                </p>
              ) : (
                library.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{component.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {component.schemaLabel}
                        {component.type === "dynamic" ? " · Rich text" : ""}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="size-8" asChild>
                      <Link
                        href={`/admin/pages/components/${component.id}`}
                        aria-label={`Edit ${component.name} content`}
                      >
                        <Settings className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      disabled={busy}
                      onClick={async () => {
                        const ok = await run(
                          addPageSection(page.id, component.id),
                          `${component.name} added`,
                        );
                        if (ok) setRecentlyAdded((cur) => new Set(cur).add(component.id));
                      }}
                      aria-label={`Add ${component.name} to this page`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cms-edit-title">Page title</Label>
              <Input id="cms-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cms-edit-slug">Page slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/</span>
                <Input
                  id="cms-edit-slug"
                  value={slug}
                  disabled={page.isProtected}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              {page.isProtected && (
                <p className="text-muted-foreground text-xs">
                  Core pages keep their address — content and sections stay fully editable.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cms-edit-breadcrumb">Breadcrumb label</Label>
              <Input
                id="cms-edit-breadcrumb"
                value={breadcrumb}
                placeholder="Empty = no hero banner"
                onChange={(e) => setBreadcrumb(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <Label htmlFor="cms-edit-active" className="font-normal">
                Page status — {isActive ? "active" : "inactive"}
              </Label>
              <Switch id="cms-edit-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <Label htmlFor="cms-edit-header-menu" className="font-normal">
                In header menu
              </Label>
              <Switch
                id="cms-edit-header-menu"
                checked={inHeaderMenu}
                disabled={busy}
                onCheckedChange={(value) => onToggleMenu("header", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <Label htmlFor="cms-edit-footer-menu" className="font-normal">
                In footer menu
              </Label>
              <Switch
                id="cms-edit-footer-menu"
                checked={inFooterMenu}
                disabled={busy}
                onCheckedChange={(value) => onToggleMenu("footer", value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={busy} onClick={onSaveSettings}>
                Save settings
              </Button>
              {!page.isProtected && (
                <Button variant="destructive" disabled={busy} onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — ordered page elements */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Page Elements</CardTitle>
          <Button size="sm" variant="ghost" asChild>
            <a href={page.path} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              View page
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-14 text-center text-sm">
              No components yet — add them from the library on the left.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {sections.map((section) => (
                    <SortableSectionRow
                      key={section.id}
                      section={section}
                      busy={busy}
                      onToggle={onToggleSection}
                      onRemove={onRemoveSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Drag to reorder — the page renders sections in this order. Use the gear to edit a
            component&apos;s content (shared everywhere it appears).
          </p>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this page?</DialogTitle>
            <DialogDescription>
              {page.title} ({page.path}) will be removed from the site. The components it uses stay
              in the library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeletePage} disabled={busy}>
              {busy ? "Deleting…" : "Delete page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
