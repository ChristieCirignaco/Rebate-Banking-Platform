import Link from "next/link";
import { ArrowDownUp, LayoutGrid, PackagePlus } from "lucide-react";

// The Add product / Transfer / wallets row under the balance hero. Textures matched to the
// mockup: frosted-glass dark, glossy gradient with an inner sheen.
export function QuickActions() {
  return (
    <div className="mt-6 flex items-center gap-3">
      <Link
        href="/products/new"
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
      >
        <PackagePlus className="size-4" />
        Add product
      </Link>
      <Link
        href="/send"
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_10px_22px_-10px_rgba(37,99,235,0.7)] transition-colors hover:from-blue-600 hover:to-indigo-700"
      >
        <ArrowDownUp className="size-4" />
        Transfer
      </Link>
      <Link
        href="/wallet"
        aria-label="Wallets"
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
      >
        <LayoutGrid className="size-5" />
      </Link>
    </div>
  );
}
