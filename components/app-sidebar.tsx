"use client";

import type { ComponentProps, ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileCheck,
  Flag,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type NavGroup = { label: string; items: NavItem[] };

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string };
};

// Mirrors the admin route map in the design spec (§10).
const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Product Submissions",
        href: "/admin/products",
        icon: Package,
      },
      {
        title: "Withdrawals",
        href: "/admin/withdrawals",
        icon: ArrowUpFromLine,
      },
      { title: "Deposits", href: "/admin/deposits", icon: ArrowDownToLine },
    ],
  },
  {
    label: "Kyc Management",
    items: [
      { title: "Awaiting Kyc", href: "/admin/kyc/pending", icon: ClipboardCheck },
      { title: "Kyc List", href: "/admin/kyc", icon: ShieldCheck },
      { title: "Kyc Templates", href: "/admin/kyc/template", icon: FileCheck },
    ],
  },
  {
    label: "People",
    items: [{ title: "Users", href: "/admin/users", icon: Users }],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Notify to Users",
        href: "/admin/notifications/to-users",
        icon: Megaphone,
      },
      { title: "All Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Finance & Wallet",
    items: [
      { title: "Currencies", href: "/admin/currencies", icon: Coins },
      {
        title: "Payment Gateways",
        href: "/admin/payment-gateways",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Feature flags", href: "/admin/feature-flags", icon: Flag },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// The dashboard is only active on an exact match; section routes also match nested pages.
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Only the most specific matching nav href wins, so a parent route (e.g.
// /admin/notifications) doesn't also highlight on a child (/admin/notifications/to-users).
function mostSpecificActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const group of NAV) {
    for (const item of group.items) {
      if (
        isActive(pathname, item.href) &&
        (best === null || item.href.length > best.length)
      ) {
        best = item.href;
      }
    }
  }
  return best;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const activeHref = mostSpecificActiveHref(pathname);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/admin">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <Landmark className="size-4" />
                </div>
                <span className="text-base font-semibold">Rebate Bank</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.href === activeHref}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
