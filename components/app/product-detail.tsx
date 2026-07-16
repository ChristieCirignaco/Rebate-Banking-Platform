import { Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRODUCT_STATUS_META, type ProductRowView } from "@/lib/products-view";

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "text-sm tabular-nums text-slate-900 dark:text-white",
          bold && "font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// The product submission detail body, shown inside the mobile drawer / desktop dialog. Pure
// presentational; rendered in the (light) portal so the dark: variants stay inert.
export function ProductDetail({ product }: { product: ProductRowView }) {
  const meta = PRODUCT_STATUS_META[product.status];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 pr-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{product.name}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            meta.badgeClass,
          )}
        >
          {meta.label}
        </span>
      </div>

      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-44 w-full rounded-xl border border-slate-200 object-cover dark:border-slate-700"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Package className="size-8" />
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
        <DetailRow label="Unit price" value={product.unitLabel} />
        <DetailRow label="Quantity" value={`${product.quantity}`} />
        <DetailRow label="Total" value={product.totalLabel} bold />
      </div>

      <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
        <p>Submitted {product.dateLabel}</p>
        {product.reviewedLabel ? <p>Reviewed {product.reviewedLabel}</p> : null}
      </div>

      {product.adminNote ? (
        <div className={cn("rounded-xl p-3 text-sm", meta.noteClass)}>{product.adminNote}</div>
      ) : product.status === "pending" ? (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          Awaiting review — you&apos;ll be notified once it&apos;s reviewed.
        </p>
      ) : null}
    </div>
  );
}
