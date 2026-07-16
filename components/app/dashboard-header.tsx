import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileMenu } from "@/components/app/mobile-menu";
import { NotificationBell } from "@/components/app/notifications/notification-bell";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "U";
}

const ICON_BTN =
  "relative flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

// Top of the mobile Home hero: a hamburger (opens the nav drawer) + avatar + time-based
// greeting on the left, notifications on the right. Mobile only — the desktop shell has its
// own sidebar + header.
export function DashboardHeader({
  greeting,
  name,
  email,
  image,
  enabled = [],
}: {
  greeting: string;
  name: string;
  email: string;
  image: string | null | undefined;
  // Enabled feature-flag keys, forwarded to the drawer so its nav matches the sidebar's.
  enabled?: string[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <MobileMenu user={{ name, email, image }} triggerClassName={ICON_BTN} enabled={enabled} />
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

      <NotificationBell variant="hero" />
    </div>
  );
}
