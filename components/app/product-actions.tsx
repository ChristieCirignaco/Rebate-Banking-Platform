"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { deleteProduct, updateProduct } from "@/app/(app)/products/actions";
import { toast } from "@/lib/toast";
import type { ProductRowView } from "@/lib/products-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Owner controls for a product submission, rendered into ProductDetail's `actions` slot.
//
// Only appears while the product is `pending`, matching the server rule exactly: once an admin
// has reviewed it the row records that decision, and updateProduct/deleteProduct will refuse it.
// Showing buttons that can only fail would be worse than showing none.
export function ProductActions({ product }: { product: ProductRowView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.priceMajor));
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (product.status !== "pending") return null;

  const busy = saving || removing;

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setSaving(true);
    try {
      const res = await updateProduct(product.id, {
        name: name.trim(),
        price,
        quantity,
        // Keep the existing image: this form doesn't re-upload, and passing undefined would
        // clear it — the action writes imageUrl on every update.
        imageUrl: product.imageUrl ?? undefined,
      });
      if (res.ok) {
        toast.success("Product updated");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  async function onDelete() {
    if (busy) return;
    setRemoving(true);
    try {
      const res = await deleteProduct(product.id);
      if (res.ok) {
        toast.success("Product withdrawn");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setRemoving(false);
    setConfirming(false);
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-name" className="text-xs font-semibold">
            Name
          </Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} disabled={saving} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-price" className="text-xs font-semibold">
              Unit price
            </Label>
            <Input
              id="p-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-qty" className="text-xs font-semibold">
              Quantity
            </Label>
            <Input
              id="p-qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              // Reset to the stored values, so cancelling actually discards the edits rather
              // than leaving them staged for the next time the form opens.
              setName(product.name);
              setPrice(String(product.priceMajor));
              setQuantity(String(product.quantity));
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      {confirming ? (
        <>
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void onDelete()}>
            {removing ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm withdraw
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Keep it
          </Button>
        </>
      ) : (
        // Inline confirm rather than window.confirm: a native dialog blocks the page and reads
        // as a browser warning rather than part of the app.
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" />
          Withdraw
        </Button>
      )}
    </div>
  );
}
