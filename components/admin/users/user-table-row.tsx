import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import {
  CodeBadge,
  EmailStatusBadge,
  KycStatusBadge,
  OnlineDot,
} from "./user-badges";
import type { AdminUser } from "./types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StackedTime({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-muted-foreground text-sm">Never</span>;
  return (
    <div className="flex flex-col">
      <span className="text-sm whitespace-nowrap">{formatDateTime(iso)}</span>
      <span className="text-muted-foreground text-xs">
        {formatRelativeTime(iso)}
      </span>
    </div>
  );
}

export function UserTableRow({ user }: { user: AdminUser }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-xs">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="font-medium whitespace-nowrap">{user.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                @{user.username}
              </span>
              <OnlineDot status={user.onlineStatus} />
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm">{user.email}</span>
          <EmailStatusBadge status={user.emailStatus} />
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm whitespace-nowrap">
            {user.kycDocument
              ? `Document: ${user.kycDocument}`
              : "No KYC document submitted"}
          </span>
          <KycStatusBadge status={user.kycStatus} />
        </div>
      </TableCell>

      <TableCell>
        <StackedTime iso={user.joinedAt} />
      </TableCell>

      <TableCell>
        <CodeBadge code={user.codeUsed} />
      </TableCell>

      <TableCell>
        <StackedTime iso={user.lastLogin} />
      </TableCell>

      <TableCell className="text-right">
        <Button asChild size="sm">
          <Link href={`/admin/users/${user.id}`}>
            Manage
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
