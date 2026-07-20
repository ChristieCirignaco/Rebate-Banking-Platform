"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";

import { submitProducts, type ProductInput } from "@/app/(app)/products/actions";
import { uploadUserProductImage } from "@/lib/media";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";
const MAX_PRODUCTS = 50;

type Row = {
  id: number;
  name: string;
  price: string;
  quantity: string;
  imageUrl: string;
  imageUploading: boolean;
};

function emptyRow(id: number): Row {
  return { id, name: "", price: "", quantity: "1", imageUrl: "", imageUploading: false };
}

// Repeatable line-item form for submitting products for rebate review (the /products/new
// flow). Mirrors the registration step but binds to the signed-in user and returns to the
// products list on success. A hard navigation avoids the router-wedge after the server action.
export function ProductSubmitForm({ currency }: { currency: string }) {
  const [rows, setRows] = useState<Row[]>([emptyRow(0)]);
  const [nextId, setNextId] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  function update(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    if (rows.length >= MAX_PRODUCTS) return;
    setRows((prev) => [...prev, emptyRow(nextId)]);
    setNextId((n) => n + 1);
  }
  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function onImageSelect(id: number, file: File | undefined) {
    if (!file) return;
    update(id, { imageUploading: true });
    try {
      const result = await uploadUserProductImage(file);
      if (result.ok) {
        update(id, { imageUrl: result.url, imageUploading: false });
      } else {
        update(id, { imageUploading: false });
        toast.error(result.error);
      }
    } catch {
      update(id, { imageUploading: false });
      toast.error("Couldn't upload the image. Please try again.");
    }
  }

  function filledRows(): Row[] {
    return rows.filter((r) => r.name.trim() || r.price.trim() || r.imageUrl.trim());
  }

  function validate(list: Row[]): string | null {
    for (const r of list) {
      if (r.name.trim().length < 2) return "Each product needs a name (at least 2 characters).";
      const price = Number(r.price);
      if (!Number.isFinite(price) || price <= 0) return "Enter a valid price for every product.";
      const qty = Number(r.quantity);
      if (!Number.isInteger(qty) || qty <= 0) return "Quantity must be a whole number of 1 or more.";
    }
    return null;
  }

  const anyUploading = rows.some((r) => r.imageUploading);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (anyUploading) {
      toast.error("Please wait for the image upload to finish.");
      return;
    }
    const list = filledRows();
    if (list.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    const error = validate(list);
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    try {
      const payload: ProductInput[] = list.map((r) => ({
        name: r.name.trim(),
        price: r.price.trim(),
        quantity: r.quantity.trim() || "1",
        imageUrl: r.imageUrl.trim() || undefined,
      }));
      const result = await submitProducts(payload);
      if (result.ok) {
        toast.success(
          `Submitted ${result.count} product${result.count > 1 ? "s" : ""} for review.`,
        );
        window.location.href = "/products";
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Product {index + 1}
            </span>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={submitting}
                aria-label={`Remove product ${index + 1}`}
                className="text-slate-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name-${row.id}`} className="text-sm font-semibold">
              Product Name
            </Label>
            <Input
              id={`name-${row.id}`}
              placeholder="e.g. Trump BTC Bar"
              value={row.name}
              onChange={(e) => update(row.id, { name: e.target.value })}
              disabled={submitting}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`price-${row.id}`} className="text-sm font-semibold">
                Price ({currency})
              </Label>
              <Input
                id={`price-${row.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={row.price}
                onChange={(e) => update(row.id, { price: e.target.value })}
                disabled={submitting}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`qty-${row.id}`} className="text-sm font-semibold">
                Quantity
              </Label>
              <Input
                id={`qty-${row.id}`}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="1"
                value={row.quantity}
                onChange={(e) => update(row.id, { quantity: e.target.value })}
                disabled={submitting}
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-semibold">
              Product Image <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            {row.imageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.imageUrl}
                  alt={`${row.name || "Product"} image`}
                  className="size-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => update(row.id, { imageUrl: "" })}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                  <X className="size-4" />
                  Remove image
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300",
                  (submitting || row.imageUploading) && "pointer-events-none opacity-60",
                )}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={submitting || row.imageUploading}
                  onChange={(e) => {
                    void onImageSelect(row.id, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {row.imageUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4" />
                    Upload image
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        disabled={submitting || rows.length >= MAX_PRODUCTS}
        className="w-full rounded-xl"
      >
        <Plus className="size-4" />
        Add another product
      </Button>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit for review"
        )}
      </button>
    </form>
  );
}
