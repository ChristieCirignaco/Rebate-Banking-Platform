"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";

import {
  deleteCmsComponent,
  toggleCmsComponentActive,
} from "@/app/admin/pages/components/actions";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CmsComponentListRow } from "@/lib/admin/cms";

export function ComponentsView({ components }: { components: CmsComponentListRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsComponentListRow | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return components;
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q) ||
        c.schemaLabel.toLowerCase().includes(q),
    );
  }, [components, search]);

  async function onToggle(component: CmsComponentListRow) {
    if (busyId) return;
    setBusyId(component.id);
    try {
      const result = await toggleCmsComponentActive(component.id, !component.isActive);
      if (result.ok) {
        toast.success(`${component.name} ${component.isActive ? "deactivated" : "activated"}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusyId(null);
  }

  async function confirmDelete() {
    const component = deleteTarget;
    if (!component) return;
    setBusyId(component.id);
    try {
      const result = await deleteCmsComponent(component.id);
      if (result.ok) {
        toast.success(`${component.name} deleted`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusyId(null);
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components"
          className="pl-8"
          aria-label="Search components"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Used on</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                      No components match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {component.name}
                          {component.isProtected && (
                            <Lock
                              className="text-muted-foreground size-3.5"
                              aria-label="Protected component"
                            />
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono text-xs">{component.key}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {component.type === "dynamic" ? "Rich text" : component.schemaLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-56 truncate text-sm">
                        {component.usedOn.length > 0 ? component.usedOn.join(", ") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={component.isActive ? "default" : "outline"}>
                          {component.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(component.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/pages/components/${component.id}`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busyId === component.id}
                                aria-label={`More actions for ${component.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onToggle(component)}>
                                {component.isActive ? (
                                  <>
                                    <EyeOff className="size-4" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Eye className="size-4" /> Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              {!component.isProtected && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(component)}
                                >
                                  <Trash2 className="size-4" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this component?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name} will be removed from every page that uses it
              {deleteTarget && deleteTarget.usedOn.length > 0
                ? ` (${deleteTarget.usedOn.join(", ")})`
                : ""}
              . This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={!!busyId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!busyId}>
              {busyId ? "Deleting…" : "Delete component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
