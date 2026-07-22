"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteUserDialog, type DeleteUserTarget } from "./delete-user-dialog";

// Per-row action menu on the users list. Always offers Manage (the old standalone button);
// the destructive Delete entry appears only for a super_admin — the server action enforces the
// same gate, so hiding it here just avoids surfacing a control that would fail. `canDelete` is
// resolved once on the server (page) and threaded down, never trusted from the client.
export function UserRowActions({
  user,
  canDelete,
}: {
  user: DeleteUserTarget;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${user.id}`}>
              <Settings2 className="size-4" />
              Manage
            </Link>
          </DropdownMenuItem>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  // Keep the menu's close from racing the dialog open — defer the state flip
                  // to after Radix finishes dismissing the menu.
                  event.preventDefault();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete user
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete ? (
        <DeleteUserDialog
          user={user}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
