import Link from "next/link";
import { ExternalLink, Mail, Package } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ProductUserSummary } from "../types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserInformationCard({ user }: { user: ProductUserSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            ) : null}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium">{user.name}</p>
            <a
              href={`mailto:${user.email}`}
              className="text-muted-foreground block truncate text-sm hover:underline"
            >
              {user.email}
            </a>
          </div>
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-right">{user.phone ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="text-right">{formatDateTime(user.joinedAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/users/${user.id}`}>
              <ExternalLink className="size-4" />
              View User Profile
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/products?user=${user.id}`}>
              <Package className="size-4" />
              View User&apos;s Products
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${user.email}`}>
              <Mail className="size-4" />
              Send Email
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
