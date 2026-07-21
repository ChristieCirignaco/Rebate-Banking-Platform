import { AvatarMenu } from "@/components/app/avatar-menu";
import { NotificationBell } from "@/components/app/notifications/notification-bell";
import { LanguageDropdown } from "@/components/app/translate/language-dropdown";
import { ThemeToggle } from "@/components/app/theme-toggle";

// Top of the mobile Home hero: avatar + time-based greeting on the left, notifications on the
// right. Mobile only — the desktop shell has its own sidebar. The nav menu no longer lives here:
// it moved to the bottom tab bar's last slot (BottomNavMenu), so the header carries only
// identity + the bell. The avatar is the account menu (profile / security / settings / sign out).
export function DashboardHeader({
  greeting,
  name,
  email,
  image,
}: {
  greeting: string;
  name: string;
  email: string;
  image: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* align="left": this avatar sits at the left edge, so the panel has to grow rightward
            or it would run off-screen. */}
        <AvatarMenu
          name={name}
          email={email}
          image={image}
          align="left"
          size={40}
          triggerRingClassName="ring-2 ring-white/20"
          avatarFallbackClassName="bg-white/15"
        />
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
        {/* On the navy home hero the toggle is always white-on-navy, regardless of theme —
            the hero background is brand chrome, not theme-driven. */}
        <ThemeToggle className="relative inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" />
        <LanguageDropdown triggerClassName="bg-white/10 text-white hover:bg-white/20" />
        <NotificationBell variant="hero" />
      </div>
    </div>
  );
}
