"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MoreHorizontal, Settings2, Trash2 } from "lucide-react";

import { deleteCmsPage, toggleCmsPageActive } from "@/app/admin/pages/actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CmsPageListRow } from "@/lib/admin/cms";

export function PagesView({ pages }: { pages: CmsPageListRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsPageListRow | null>(null);

  async function onToggle(page: CmsPageListRow) {
    if (busyId) return;
    setBusyId(page.id);
    try {
      const result = await toggleCmsPageActive(page.id, !page.isActive);
      if (result.ok) {
        toast.success(`${page.title} ${page.isActive ? "deactivated" : "activated"}`);
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
    const page = deleteTarget;
    if (!page) return;
    setBusyId(page.id);
    try {
      const result = await deleteCmsPage(page.id);
      if (result.ok) {
        toast.success(`${page.title} deleted`);
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
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {page.title}
                        {page.isProtected && (
                          <Badge variant="secondary" className="text-[10px]">
                            Core
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {page.path}
                    </TableCell>
                    <TableCell>{page.sectionCount}</TableCell>
                    <TableCell>
                      <Badge variant={page.isActive ? "default" : "outline"}>
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(page.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/pages/${page.id}`}>
                            <Settings2 className="size-4" />
                            Manage
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              disabled={busyId === page.id}
                              aria-label={`More actions for ${page.title}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onToggle(page)}>
                              {page.isActive ? (
                                <>
                                  <EyeOff className="size-4" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="size-4" /> Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {!page.isProtected && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(page)}
                              >
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this page?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.title} ({deleteTarget?.path}) will be removed from the site. The
              components it uses stay in the library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={!!busyId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!busyId}>
              {busyId ? "Deleting…" : "Delete page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
