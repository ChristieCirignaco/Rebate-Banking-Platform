import Link from "next/link";
import { Eye } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from "@/lib/format";
import { StatusBadge } from "./product-badges";
import { ProductImage } from "./product-image";
import { ProductStatusActions } from "./product-status-actions";
import type { ProductSubmission } from "./types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProductTableRow({ product }: { product: ProductSubmission }) {
  const { user } = product;
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
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium whitespace-nowrap">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {product.productName}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <ProductImage
          src={product.imageUrl}
          alt={product.productName}
          className="size-12"
        />
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(product.price, product.currency)}
          </span>
          <span className="text-muted-foreground text-xs">
            Qty: {formatNumber(product.quantity)}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge status={product.status} />
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm whitespace-nowrap">
            {formatDateTime(product.submittedAt)}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(product.submittedAt)}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-9"
            title="View Details"
            aria-label="View Details"
          >
            <Link href={`/admin/products/${product.id}`}>
              <Eye className="size-4" />
            </Link>
          </Button>
          <ProductStatusActions
            productId={product.id}
            status={product.status}
            variant="icon"
            note={product.adminNote}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
