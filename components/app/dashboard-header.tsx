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

// Top of the mobile Home hero: avatar + time-based greeting on the left, notifications and the
// nav drawer's hamburger on the right. Mobile only — the desktop shell has its own sidebar.
//
// The hamburger used to lead the left cluster, ahead of the avatar and greeting. That put a
// navigation control inside the identity group and pushed the user's own name inward, behind a
// button, with three elements fighting on the left against one on the right. Identity leads now
// and the two chrome controls sit together, which also hands the whole right edge — and the
// thumb that reaches it — to the things you actually tap.
//
// It stays a visible hamburger rather than folding into the avatar (the tidier-looking option):
// the bottom tab bar surfaces 4 destinations and the drawer holds all 14, so this button is the
// only route to ~10 pages. That's primary navigation, not overflow, and it has to look like it.
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
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar size="lg" className="shrink-0 ring-2 ring-white/20">
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

      {/* shrink-0: the name truncates, the controls never do. */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell variant="hero" />
        <MobileMenu
          user={{ name, email, image }}
          triggerClassName={ICON_BTN}
          enabled={enabled}
        />
      </div>
    </div>
  );
}
