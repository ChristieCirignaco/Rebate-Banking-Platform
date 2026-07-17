import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AdminNotificationBell } from "@/components/admin/notifications/admin-notification-bell";
import { ModeToggle } from "@/components/admin/mode-toggle";

// Top chrome bar for the admin surface. The bell is self-fetching, so this stays a server
// component.
export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Administration</h1>
        <div className="ml-auto flex items-center gap-1">
          <AdminNotificationBell />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
