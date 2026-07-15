import { Bell, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComingSoonButton } from "@/components/app/coming-soon-button";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "U";
}

const ICON_BTN =
  "relative flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

// Top of the Home hero: avatar + time-based greeting on the left, search + notifications on
// the right. Search/bell are stubs for now (coming-soon toast).
export function DashboardHeader({
  greeting,
  name,
  image,
  unreadCount,
}: {
  greeting: string;
  name: string;
  image: string | null | undefined;
  unreadCount: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar size="lg" className="ring-2 ring-white/20">
          {image ? <AvatarImage src={image} alt={name} /> : null}
          <AvatarFallback className="bg-white/15 text-sm font-semibold text-white">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-white/70">{greeting}!</p>
          <p className="truncate text-base font-semibold text-white">{name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ComingSoonButton ariaLabel="Search" message="Search is coming soon." className={ICON_BTN}>
          <Search className="size-5" />
        </ComingSoonButton>
        <ComingSoonButton
          ariaLabel="Notifications"
          message="Notifications are coming soon."
          className={ICON_BTN}
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </ComingSoonButton>
      </div>
    </div>
  );
}
