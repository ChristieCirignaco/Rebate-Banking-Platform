"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { addWallet } from "@/app/(app)/wallet/actions";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

export type AddableCurrency = { code: string; name: string };

// The header control on /wallet. The button is always rendered so the limit is visible rather
// than mysterious: at the cap (or with no currency left to add) it stays disabled and says why.
export function AddWalletDialog({
  currencies,
  remaining,
}: {
  currencies: AddableCurrency[];
  remaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(currencies[0]?.code ?? "");
  const [saving, setSaving] = useState(false);

  const atCap = remaining <= 0;
  const nothingLeft = currencies.length === 0;
  const disabled = atCap || nothingLeft;

  // `code` is the user's pick, but the list of addable currencies changes underneath it: after a
  // successful add, router.refresh() drops the currency we just added from `currencies` while
  // this component stays mounted — so useState's initializer never re-runs and `code` still
  // names a currency the user now owns. Reopening and submitting then sends that stale code and
  // addWalletFor rejects it with "A USD wallet already exists."
  //
  // So treat a pick that is no longer addable as no pick at all and fall back to the first real
  // option. Deriving it every render also self-heals if `currencies` changes for any other
  // reason (an admin deactivating a currency mid-session, say).
  const selected = currencies.some((c) => c.code === code) ? code : (currencies[0]?.code ?? "");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || !selected) return;
    setSaving(true);
    try {
      const res = await addWallet(selected);
      if (res.ok) {
        toast.success(`${selected} wallet added`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          atCap
            ? "You've reached the maximum of 3 wallets"
            : nothingLeft
              ? "You already hold every available currency"
              : undefined
        }
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" />
        Add wallet
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setSaving(false);
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a wallet</DialogTitle>
            <DialogDescription>
              {remaining === 1
                ? "You can add 1 more wallet."
                : `You can add ${remaining} more wallets.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="w-currency" className="text-sm font-semibold">
                Currency
              </Label>
              <select
                id="w-currency"
                value={selected}
                onChange={(e) => setCode(e.target.value)}
                className={SELECT}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving || !code}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Add wallet
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
