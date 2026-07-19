import { Skeleton } from "@/components/ui/skeleton";

// Fallback for the lazily-loaded MenuHubGrid chunk. Tile geometry is copied from the real grid
// (grid-cols-4, size-11 circle, two label lines) so the sheet doesn't resize under the user's
// thumb when the chunk lands — the sheet is anchored to the bottom of the screen, so a height
// change there moves every tile.
export function MenuHubSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
        >
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
