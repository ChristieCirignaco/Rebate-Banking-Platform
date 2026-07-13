"use client";

import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { EmptyState } from "../shared";
import type { ReferralUser } from "../types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserReferralsTab({ referrals }: { referrals: ReferralUser[] }) {
  return (
    <Card className="overflow-hidden py-0">
      {referrals.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Referral Found"
          description="This user hasn't referred anyone yet."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.map((referral) => (
              <TableRow key={referral.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {referral.avatarUrl ? (
                        <AvatarImage
                          src={referral.avatarUrl}
                          alt={referral.name}
                        />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {initials(referral.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{referral.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {referral.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm">
                      {formatDateTime(referral.joinedAt)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(referral.joinedAt)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
