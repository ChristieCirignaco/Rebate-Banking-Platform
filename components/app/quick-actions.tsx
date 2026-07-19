import Link from "next/link";
import { ArrowDownUp, PackagePlus } from "lucide-react";

import { visibleNav } from "@/components/app/app-nav";
import { MenuHub } from "@/components/app/menu-hub";

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
//
// The two pills are flag-filtered like every other nav surface. They weren't before: with
// Products or Send Money switched off in admin, the buttons still rendered and walked the user
// into a redirect back to the dashboard, which reads as a broken link rather than a disabled
// feature. The grid button always shows — the hub it opens is itself flag-filtered.
export function QuickActions({ enabled }: { enabled: string[] }) {
  const on = new Set(enabled);

  return (
    <div className="mt-6 flex items-center gap-3">
      {on.has("product_submission") ? (
        <Link
          href="/products/new"
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.14] lg:gap-2 lg:px-4 lg:text-sm"
        >
          <PackagePlus className="size-4 shrink-0" />
          <span className="truncate">Add product</span>
        </Link>
      ) : null}
      {on.has("send_money") ? (
        <Link
          href="/send"
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-600 px-3 py-3.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_10px_22px_-10px_rgba(37,99,235,0.7)] transition-colors hover:from-blue-600 hover:to-indigo-700 lg:gap-2 lg:px-4 lg:text-sm"
        >
          <ArrowDownUp className="size-4 shrink-0" />
          <span className="truncate">Transfer</span>
        </Link>
      ) : null}
      {/* Tile count is resolved here, on the server, so the hub's skeleton renders the exact
          number of tiles the grid will — otherwise the sheet resizes when the chunk lands.
          Counting here rather than inside MenuHub keeps app-nav (and its icon set) out of the
          client chunk; only the number crosses. */}
      <MenuHub enabled={enabled} tileCount={visibleNav(enabled).length} />
    </div>
  );
}
