"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ImagePlus, Loader2, Package, Plus, Trash2, X } from "lucide-react";

import {
  skipRegistrationProducts,
  submitRegistrationProducts,
  type ProductInput,
} from "@/app/register/products/actions";
import { uploadRegistrationProductImage } from "@/lib/media";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AUTH_FIELD_CLASS, AuthShell, AuthSubmitButton } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  id: number;
  name: string;
  price: string;
  quantity: string;
  imageUrl: string;
  imageUploading: boolean;
};

const MAX_PRODUCTS = 50;

function emptyRow(id: number): Row {
  return { id, name: "", price: "", quantity: "1", imageUrl: "", imageUploading: false };
}

// Registration step 2 (optional): the pending user can list product submissions for rebate
// review, or skip. On finish we hard-navigate to the login page, which shows the inline
// "registration complete — pending approval" notice.
export function RegisterProductsForm({ logoUrl }: { logoUrl?: string | null }) {
  const [rows, setRows] = useState<Row[]>([emptyRow(0)]);
  const [nextId, setNextId] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

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
      const result = await uploadRegistrationProductImage(file);
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

  // Rows the user actually filled in (a blank trailing row is ignored, not an error).
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

  const busy = submitting || skipping;
  const anyUploading = rows.some((r) => r.imageUploading);

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    if (anyUploading) {
      toast.error("Please wait for the image upload to finish.");
      return;
    }
    const list = filledRows();
    if (list.length === 0) {
      // Nothing entered — treat "Submit" like a skip so the user is never stuck.
      await onSkip();
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
      const result = await submitRegistrationProducts(payload);
      if (result.ok) {
        window.location.href = "/login?registered=1";
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  async function onSkip() {
    if (busy) return;
    setSkipping(true);
    try {
      const result = await skipRegistrationProducts();
      if (result.ok) {
        window.location.href = "/login?registered=1";
        return;
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSkipping(false);
  }

  return (
    <AuthShell logoUrl={logoUrl}>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Package className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Add your products</h1>
          <p className="text-muted-foreground text-sm">
            List products to submit for rebate review. This step is optional — you can skip it
            and add them later.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="border-slate-200 dark:border-slate-700 flex flex-col gap-3 rounded-2xl border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Product {index + 1}
              </span>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={busy}
                  aria-label={`Remove product ${index + 1}`}
                  className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
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
                placeholder="e.g. Wireless Headphones"
                value={row.name}
                onChange={(e) => update(row.id, { name: e.target.value })}
                disabled={busy}
                className={AUTH_FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`price-${row.id}`} className="text-sm font-semibold">
                  Price
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
                  disabled={busy}
                  className={AUTH_FIELD_CLASS}
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
                  disabled={busy}
                  className={AUTH_FIELD_CLASS}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">
                Product Image{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
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
                    disabled={busy}
                    className="text-muted-foreground hover:text-red-600 inline-flex items-center gap-1 text-sm font-medium disabled:opacity-50"
                  >
                    <X className="size-4" />
                    Remove image
                  </button>
                </div>
              ) : (
                <label
                  className={cn(
                    "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300",
                    (busy || row.imageUploading) && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={busy || row.imageUploading}
                    onChange={(e) => {
                      void onImageSelect(row.id, e.target.files?.[0]);
                      e.target.value = ""; // allow re-selecting the same file
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
          disabled={busy || rows.length >= MAX_PRODUCTS}
          className="w-full rounded-xl"
        >
          <Plus className="size-4" />
          Add another product
        </Button>

        <div className="mt-1 flex flex-col gap-3">
          <AuthSubmitButton loading={submitting} loadingLabel="Submitting…" disabled={skipping}>
            Submit products
          </AuthSubmitButton>
          <button
            type="button"
            onClick={() => onSkip()}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground text-sm font-semibold disabled:opacity-60"
          >
            {skipping ? "Please wait…" : "Skip for now"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
