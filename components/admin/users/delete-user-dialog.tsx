"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { deleteUser } from "@/app/admin/users/[id]/actions";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/lib/toast";

// The minimum a caller needs to pass to identify the account being deleted — shown back in the
// modal so the admin can see exactly whose account they're about to destroy.
export interface DeleteUserTarget {
  id: string;
  name: string;
  username: string;
  email: string;
  joinedAt: string; // ISO
}

// Date only ("Jul 16, 2026") — the modal wants the join DATE, not the time-of-day that
// formatDateTime() carries. UTC so it reads the same regardless of the admin's timezone.
function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const CONSEQUENCES = [
  "User account will be permanently deleted",
  "All user transactions will be removed",
  "All user data will be lost forever",
  "User cannot be recovered after deletion",
];

// Controlled confirmation dialog for a hard user delete. Owns the server call and the password
// field; the caller supplies the target and decides what happens AFTER success (onDeleted) —
// the list refreshes in place, the detail page navigates away since the record is gone.
export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: {
  user: DeleteUserTarget;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onDeleted?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  // Don't let the dialog close mid-delete (that would drop the spinner and the toast target),
  // and always clear the password when it does close so it never lingers in memory.
  function handleOpenChange(next: boolean) {
    if (isPending) return;
    if (!next) setPassword("");
    onOpenChange(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || isPending) return;
    startTransition(async () => {
      const res = await deleteUser(user.id, password);
      if (res.ok) {
        toast.success(`${user.name} has been permanently deleted`);
        setPassword("");
        onOpenChange(false);
        onDeleted?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Delete User Confirmation
          </DialogTitle>
          <DialogDescription className="sr-only">
            Permanently delete {user.name} and all of their data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="border-destructive/30 bg-destructive/10 rounded-lg border p-4">
            <p className="text-destructive font-semibold">Are you absolutely sure?</p>
            <p className="text-destructive/90 mt-0.5 text-sm">This action cannot be undone!</p>
            <ul className="text-destructive/90 mt-3 flex flex-col gap-1.5 text-sm">
              {CONSEQUENCES.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="bg-muted/40 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user.name}</dd>
            <dt className="text-muted-foreground">Username</dt>
            <dd className="font-medium">{user.username}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{user.email}</dd>
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="font-medium">{formatJoined(user.joinedAt)}</dd>
          </dl>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-user-password">Enter your admin password to confirm</Label>
            <Input
              id="delete-user-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your admin password"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              We need your password to confirm this critical action.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !password}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
