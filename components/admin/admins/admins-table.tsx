"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCheck } from "lucide-react";

import { reactivateAdmin } from "@/app/admin/users/admin/actions";
import { StackedTime, initials } from "@/components/admin/deposits/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { AdminRoleBadge, AdminStatusBadge } from "./admin-badges";
import { DeactivateAdminDialog } from "./deactivate-admin-dialog";
import { EditAdminDialog } from "./edit-admin-dialog";
import type { AdminAccount } from "./types";

function ReactivateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await reactivateAdmin(id);
      if (result.ok) {
        toast.success(`${name} has been reactivated.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      <UserCheck className="size-4" />
      {isPending ? "Reactivating…" : "Reactivate"}
    </Button>
  );
}

export function AdminsTable({
  admins,
  canManage,
}: {
  admins: AdminAccount[];
  canManage: boolean;
}) {
  if (admins.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <ShieldCheck className="text-muted-foreground size-6" />
        </div>
        <p className="font-medium">No admin accounts yet</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Login</TableHead>
            {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    {admin.avatarUrl ? (
                      <AvatarImage src={admin.avatarUrl} alt={admin.name} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {initials(admin.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium whitespace-nowrap">{admin.name}</span>
                    <span className="text-muted-foreground text-xs">{admin.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <AdminRoleBadge role={admin.role} />
              </TableCell>
              <TableCell>
                <AdminStatusBadge status={admin.status} />
              </TableCell>
              <TableCell>
                <StackedTime iso={admin.joinedAt} />
              </TableCell>
              <TableCell>
                {admin.lastLogin ? (
                  <StackedTime iso={admin.lastLogin} />
                ) : (
                  <span className="text-muted-foreground text-sm">Never</span>
                )}
              </TableCell>
              {canManage ? (
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <EditAdminDialog admin={admin} />
                    {admin.role === "super_admin" ? (
                      <span className="text-muted-foreground self-center text-xs">
                        Protected
                      </span>
                    ) : admin.status === "suspended" ? (
                      <ReactivateButton id={admin.id} name={admin.name} />
                    ) : (
                      <DeactivateAdminDialog id={admin.id} name={admin.name} />
                    )}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
