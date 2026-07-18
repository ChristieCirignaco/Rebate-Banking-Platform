"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserCheck, X } from "lucide-react";

import { approveUser, rejectUser } from "@/app/admin/users/pending/actions";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmailStatusBadge } from "@/components/admin/users/user-badges";
import type {
  PendingApprovals,
  PendingApprovalUser,
} from "@/lib/admin/pending-approvals";

export function PendingApprovalsView({ data }: { data: PendingApprovals }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingApprovalUser | null>(null);

  async function onApprove(user: PendingApprovalUser) {
    if (busyId) return;
    setBusyId(user.id);
    try {
      const result = await approveUser(user.id);
      if (result.ok) {
        toast.success(`${user.name} approved`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusyId(null);
  }

  async function confirmReject() {
    const user = rejectTarget;
    if (!user) return;
    setBusyId(user.id);
    try {
      const result = await rejectUser(user.id);
      if (result.ok) {
        toast.success(`${user.name}'s registration was rejected`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBusyId(null);
    setRejectTarget(null);
  }

  if (data.users.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <UserCheck className="size-6" />
          </div>
          <p className="font-medium">No pending registrations</p>
          <p className="text-muted-foreground text-sm">
            New sign-ups awaiting approval will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => {
                  const busy = busyId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">{user.email}</span>
                          <EmailStatusBadge
                            status={user.emailVerified ? "verified" : "unverified"}
                          />
                        </div>
                      </TableCell>
                      <TableCell>{user.country ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(user.joinedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => onApprove(user)}
                            disabled={busy}
                            title={
                              user.emailVerified
                                ? "Approve this account"
                                : "This user hasn't verified their email yet"
                            }
                          >
                            <Check className="size-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(user)}
                            disabled={busy}
                          >
                            <X className="size-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this registration?</DialogTitle>
            <DialogDescription>
              {rejectTarget?.name} ({rejectTarget?.email}) will be suspended and won&apos;t be
              able to sign in. You can reactivate them later from their profile (open the account
              from the Users list).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={!!busyId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!!busyId}
            >
              {busyId ? "Rejecting…" : "Reject registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
