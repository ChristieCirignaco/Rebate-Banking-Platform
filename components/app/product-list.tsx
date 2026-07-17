"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRODUCT_STATUS_META, type ProductRowView } from "@/lib/products-view";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ProductDetail } from "@/components/app/product-detail";
import { ProductActions } from "@/components/app/product-actions";

// The tappable submissions list. Each row opens a detail view — a bottom drawer on mobile, a
// centered dialog on desktop — chosen by the `variant` the page passes (each viewport renders
// its own instance, so no viewport hook / hydration flash is needed).
export function ProductList({
  items,
  variant,
}: {
  items: ProductRowView[];
  variant: "mobile" | "desktop";
}) {
  const [selected, setSelected] = useState<ProductRowView | null>(null);
  const open = selected !== null;
  const onOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
  };

  const rows = (
    <div className="flex flex-col gap-2.5">
      {items.map((product) => {
        const meta = PRODUCT_STATUS_META[product.status];
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => setSelected(product)}
            className="flex w-full gap-3 rounded-2xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
          >
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
                    meta.badgeClass,
                  )}
                >
                  {meta.label}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (variant === "mobile") {
    return (
      <>
        {rows}
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="sm:mx-auto sm:max-w-[600px]">
            <DrawerTitle className="sr-only">{selected?.name ?? "Product"}</DrawerTitle>
            <DrawerDescription className="sr-only">Rebate submission details</DrawerDescription>
            <div className="px-4 pt-2 pb-6">
              {selected ? <ProductDetail product={selected} actions={<ProductActions product={selected} />} /> : null}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {rows}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">{selected?.name ?? "Product"}</DialogTitle>
          <DialogDescription className="sr-only">Rebate submission details</DialogDescription>
          {selected ? <ProductDetail product={selected} actions={<ProductActions product={selected} />} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
