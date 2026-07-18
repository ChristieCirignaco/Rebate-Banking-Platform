import Link from "next/link";
import { ArrowDownUp, LayoutGrid, PackagePlus } from "lucide-react";

// The Add product / Transfer / wallets row under the balance hero. Textures matched to the
// mockup: frosted-glass dark, glossy gradient with an inner sheen.
//
// Sizing note — "Add product" used to wrap onto two lines on narrower phones. The row gives each
// flex-1 button roughly (viewport − 40px page padding − 48px wallets button − 24px gaps) / 2,
// i.e. ~124px at 360px wide, and the label at text-sm with px-4 needs ~140px. It fit on wide
// phones and broke on 360–375px ones, which is why it looked intermittent.
//
// Three things hold it on one line now, and they only work together:
//   · truncate on the label — never wraps. On its own this would be enough to stop the break,
//     but a flex item won't shrink below its content, so without the rest it would trade the
//     wrap for horizontal overflow of the hero.
//   · tighter gap/padding/type below lg — buys back the ~16px that was missing.
//   · min-w-0 — lets the button actually shrink, which is what makes truncate reachable at all;
//     it's the floor, so the worst case is an ellipsis rather than a broken layout.
// If the labels ever get longer, revisit the arithmetic above rather than just nudging padding.
export function QuickActions() {
  return (
    <div className="mt-6 flex items-center gap-3">
      <Link
        href="/products/new"
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.14] lg:gap-2 lg:px-4 lg:text-sm"
      >
        <PackagePlus className="size-4 shrink-0" />
        <span className="truncate">Add product</span>
      </Link>
      <Link
        href="/send"
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 px-3 py-3.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_10px_22px_-10px_rgba(37,99,235,0.7)] transition-colors hover:from-blue-600 hover:to-indigo-700 lg:gap-2 lg:px-4 lg:text-sm"
      >
        <ArrowDownUp className="size-4 shrink-0" />
        <span className="truncate">Transfer</span>
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
