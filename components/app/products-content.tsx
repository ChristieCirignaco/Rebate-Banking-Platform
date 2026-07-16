import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductRowView, ProductStats, UserProductsPage } from "@/lib/products";

const STATUS_BADGE: Record<ProductRowView["status"], { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
};

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className={cn("text-2xl font-bold tabular-nums", accent)}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function ProductRow({ product }: { product: ProductRowView }) {
  const badge = STATUS_BADGE[product.status];
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-14 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Package className="size-6" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {product.name}
          </p>
          <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {product.totalLabel}
          </p>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {product.quantity} × {product.unitLabel} · {product.dateLabel}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </div>
        {product.adminNote ? (
          <p className="mt-1 truncate text-xs text-slate-400 italic dark:text-slate-500">
            {product.adminNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// The Products hub content: header + a "New submission" button, the count-by-status chips,
// and the paginated submissions list. Pure server component — rendered by both the mobile
// (light) and desktop (dark-scoped) wrappers on the page.
export function ProductsContent({
  stats,
  page,
  canSubmit,
}: {
  stats: ProductStats;
  page: UserProductsPage;
  canSubmit: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-4 lg:pt-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-2xl dark:text-white">
            Products
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit purchases for rebate review.
          </p>
        </div>
        {canSubmit ? (
          <Link
            href="/products/new"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New submission</span>
            <span className="sm:hidden">Add</span>
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total" value={stats.total} accent="text-slate-900 dark:text-white" />
        <StatChip label="Pending" value={stats.pending} accent="text-amber-600 dark:text-amber-400" />
        <StatChip
          label="Approved"
          value={stats.approved}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatChip label="Rejected" value={stats.rejected} accent="text-red-600 dark:text-red-400" />
      </div>

      {!canSubmit ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          New product submissions are currently closed. You can still view your past submissions
          below.
        </div>
      ) : null}

      <div className="mt-4">
        {page.items.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {page.items.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Package className="size-6" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No submissions yet
            </p>
            {canSubmit ? (
              <Link href="/products/new" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Submit your first product
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {page.pageCount > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <PageLink
            href={`/products?page=${page.page - 1}`}
            disabled={page.page <= 1}
            direction="prev"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {page.page} of {page.pageCount}
          </span>
          <PageLink
            href={`/products?page=${page.page + 1}`}
            disabled={page.page >= page.pageCount}
            direction="next"
          />
        </div>
      ) : null}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  direction,
}: {
  href: string;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous" : "Next";
  const className =
    "flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300";
  if (disabled) {
    return (
      <span className={cn(className, "cursor-not-allowed opacity-40")}>
        {direction === "prev" ? <Icon className="size-4" /> : null}
        {label}
        {direction === "next" ? <Icon className="size-4" /> : null}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(className, "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
      {direction === "prev" ? <Icon className="size-4" /> : null}
      {label}
      {direction === "next" ? <Icon className="size-4" /> : null}
    </Link>
  );
}
