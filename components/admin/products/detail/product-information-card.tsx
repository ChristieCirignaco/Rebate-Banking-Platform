import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { StatusBadge } from "../product-badges";
import { ProductStatusActions } from "../product-status-actions";
import type { ProductSubmission } from "../types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border/60 flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium sm:text-right">{children}</span>
    </div>
  );
}

export function ProductInformationCard({
  product,
}: {
  product: ProductSubmission;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-base font-medium">
            Product Information
          </h2>
          <ProductStatusActions
            productId={product.id}
            status={product.status}
            variant="buttons"
            note={product.adminNote}
          />
        </div>

        <div className="flex flex-col">
          <Field label="Product Name">{product.productName}</Field>
          <Field label="Price">
            <span className="tabular-nums">
              {formatCurrency(product.price, product.currency)}
            </span>
          </Field>
          <Field label="Quantity">{formatNumber(product.quantity)}</Field>
          <Field label="Status">
            <StatusBadge status={product.status} />
          </Field>
          <Field label="Submitted">{formatDateTime(product.submittedAt)}</Field>
          <Field label="Last Updated">{formatDateTime(product.updatedAt)}</Field>
          <Field label="ID">
            <span className="font-mono text-xs break-all">#{product.id}</span>
          </Field>
        </div>

        {product.adminNote ? (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Admin Note
            </p>
            <p className="mt-1 text-sm">{product.adminNote}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
