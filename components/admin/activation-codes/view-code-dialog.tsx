"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { initials } from "@/lib/utils";
import { CodeStatusBadge, CodeTypeBadge, usageLabel } from "./activation-code-badges";
import type { ActivationCodeDetail } from "./types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium break-words">{children}</span>
    </div>
  );
}

// Opened from a row's Actions menu rather than owning its own trigger. The detail fetch
// happens in the row-actions click handler (a real event), not an effect here — this
// component is purely presentational over whatever `detail`/`loading` it's handed.
export function ViewCodeDialog({
  open,
  onOpenChange,
  loading,
  detail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  detail: ActivationCodeDetail | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activation Code Details</DialogTitle>
          <DialogDescription>Usage and creator information for this code.</DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <p className="text-muted-foreground py-10 text-center text-sm">Loading…</p>
        ) : (
          <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border px-3">
                <p className="text-muted-foreground pt-2 text-xs font-medium tracking-wide uppercase">
                  Code Information
                </p>
                <Row label="Code">
                  <span className="font-mono">{detail.code}</span>
                </Row>
                <Row label="Status">
                  <CodeStatusBadge status={detail.status} />
                </Row>
                <Row label="Type">
                  <CodeTypeBadge type={detail.type} />
                </Row>
                <Row label="Usage Count">{usageLabel(detail.usageCount)}</Row>
              </div>
              <div className="rounded-lg border px-3">
                <p className="text-muted-foreground pt-2 text-xs font-medium tracking-wide uppercase">
                  Creator Information
                </p>
                <Row label="Created By">{detail.createdByName ?? "System"}</Row>
                <Row label="Created">{formatDateTime(detail.createdAt)}</Row>
                <Row label="Last Updated">{formatDateTime(detail.updatedAt)}</Row>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Admin notes</span>
              <p className="break-words">{detail.notes ?? "No notes available."}</p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Recent Users (Last 5)</h3>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.recentUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground h-20 text-center">
                          No users have used this code yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.recentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                {user.avatarUrl ? (
                                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {initials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium whitespace-nowrap">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(user.usedAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
