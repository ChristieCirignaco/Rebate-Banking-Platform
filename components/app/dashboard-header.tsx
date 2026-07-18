import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/app/notifications/notification-bell";
import { LanguageDropdown } from "@/components/app/translate/language-dropdown";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "U";
}

// Top of the mobile Home hero: avatar + time-based greeting on the left, notifications on the
// right. Mobile only — the desktop shell has its own sidebar. The nav menu no longer lives here:
// it moved to the bottom tab bar's last slot (BottomNavMenu), so the header carries only
// identity + the bell.
export function DashboardHeader({
  greeting,
  name,
  image,
}: {
  greeting: string;
  name: string;
  image: string | null | undefined;
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
          {/* The user's own name is PII — never send it to the translator. */}
          <p translate="no" className="notranslate truncate text-base font-semibold text-white">
            {name}
          </p>
        </div>
      </div>

      {/* shrink-0: the name truncates, the controls never do. */}
      <div className="flex shrink-0 items-center gap-2">
        <LanguageDropdown triggerClassName="bg-white/10 text-white hover:bg-white/20" />
        <NotificationBell variant="hero" />
      </div>
    </div>
  );
}
