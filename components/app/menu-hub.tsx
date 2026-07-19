"use client";

import { lazy, Suspense, useState } from "react";
import { LayoutGrid } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MenuHubSkeleton } from "@/components/app/skeletons/menu-hub-skeleton";

// The grid button in the balance hero. It used to be a plain link to /wallet; it now opens a
// hub sheet listing every feature as an icon tile, which is what the grid glyph implied all
// along.
//
// The contents load as a separate chunk: the nav table and its icons aren't in the dashboard's
// initial bundle, and the skeleton below is shown while that chunk arrives on first open. ssr:
// false because there is nothing to render server-side until the user opens the sheet.
// lazy + Suspense rather than next/dynamic: dynamic()'s `loading` option takes no props, and the
// skeleton needs the tile count to match the grid it's standing in for.
const MenuHubGrid = lazy(() =>
  import("@/components/app/menu-hub-grid").then((m) => ({ default: m.MenuHubGrid })),
);

export function MenuHub({
  enabled,
  tileCount,
}: {
  enabled: string[];
  /** Resolved server-side in QuickActions so the skeleton matches the grid exactly. */
  tileCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="All features"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
      >
        <LayoutGrid className="size-5" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="sm:mx-auto sm:max-w-[480px]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>All features</DrawerTitle>
            <DrawerDescription>Everything your account can do.</DrawerDescription>
          </DrawerHeader>

          {/* min-h-0 + overflow-y-auto so the grid is what scrolls if the tile count outgrows the
              sheet's 80dvh cap; pb clears the home indicator on gesture-nav phones. */}
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {/* Mounted only while open, so the chunk is fetched on first open rather than with
                the dashboard, and the skeleton is what the user sees in the meantime. */}
            {open ? (
              <Suspense fallback={<MenuHubSkeleton count={tileCount} />}>
                <MenuHubGrid enabled={enabled} onNavigate={() => setOpen(false)} />
              </Suspense>
            ) : (
              <MenuHubSkeleton count={tileCount} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
