"use client";

import type { ComponentProps, ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpFromLine,
  Bell,
  ChevronRight,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileCheck,
  Gift,
  HandCoins,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  // Present only on a collapsible parent (e.g. "Support Ticket") — the parent itself is
  // a toggle, not a link, so `href` on a parent is just used for active-route matching.
  children?: NavItem[];
};

type NavGroup = { label: string; items: NavItem[] };

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; image: string | null };
  // Admin Branding + brand name from System Settings. Either logo may be null; the sidebar
  // swaps between them on theme and falls back to a brand mark + name when neither is set.
  branding: {
    logoLight: string | null;
    logoDark: string | null;
    brandName: string;
  };
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
      { title: "Transfers", href: "/admin/transfers", icon: ArrowLeftRight },
      { title: "Money Requests", href: "/admin/requests", icon: HandCoins },
      { title: "Exchanges", href: "/admin/exchanges", icon: ArrowRightLeft },
      { title: "Vouchers", href: "/admin/vouchers", icon: Ticket },
      { title: "Referrals", href: "/admin/referrals", icon: Gift },
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
    items: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Pending Approvals", href: "/admin/users/pending", icon: UserCheck },
      { title: "Admins", href: "/admin/users/admin", icon: UserCog },
      { title: "Activation Codes", href: "/admin/activation-codes", icon: KeyRound },
    ],
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
    // "Support Category" is a separate, sibling section (not built yet) — it belongs in
    // this group too once it exists, as a flat item alongside the collapsible ticket item.
    label: "Support",
    items: [
      {
        title: "Support Ticket",
        href: "/admin/support-ticket",
        icon: LifeBuoy,
        children: [
          { title: "Pending Ticket", href: "/admin/support-ticket/pending", icon: LifeBuoy },
          {
            title: "In Progress Ticket",
            href: "/admin/support-ticket/inprogress",
            icon: LifeBuoy,
          },
          { title: "Close Ticket", href: "/admin/support-ticket/close", icon: LifeBuoy },
          { title: "All Ticket", href: "/admin/support-ticket/history", icon: LifeBuoy },
        ],
      },
    ],
  },
  {
    label: "Finance & Wallet",
    items: [
      { title: "Transactions", href: "/admin/transaction", icon: Receipt },
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
    items: [{ title: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

// The dashboard is only active on an exact match; section routes also match nested pages.
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Only the most specific matching nav href wins, so a parent route (e.g.
// /admin/notifications) doesn't also highlight on a child (/admin/notifications/to-users).
// A collapsible parent's own href is a toggle target, not a real page, so it never wins —
// only leaf items (including a collapsible's children) are eligible.
function mostSpecificActiveHref(pathname: string): string | null {
  let best: string | null = null;
  function visit(items: NavItem[]) {
    for (const item of items) {
      if (item.children) {
        visit(item.children);
        continue;
      }
      if (isActive(pathname, item.href) && (best === null || item.href.length > best.length)) {
        best = item.href;
      }
    }
  }
  for (const group of NAV) visit(group.items);
  return best;
}

// Whether a collapsible parent should render expanded on load — true if the current route
// is under any of its children.
function hasActiveChild(item: NavItem, pathname: string): boolean {
  return !!item.children?.some((child) => isActive(pathname, child.href));
}

export function AppSidebar({ user, branding, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const activeHref = mostSpecificActiveHref(pathname);

  const { logoLight, logoDark, brandName } = branding;
  const hasLogo = Boolean(logoLight || logoDark);
  // If only one variant is uploaded, reuse it for both themes so a logo never disappears.
  const lightSrc = logoLight || logoDark || "";
  const darkSrc = logoDark || logoLight || "";

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
                {hasLogo ? (
                  <>
                    {/* Theme-aware brand logo (System Settings → Branding). The `.dark` class
                        lives on <html> via AdminThemeProvider, so the swap is pure CSS. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lightSrc}
                      alt={brandName}
                      className="h-6 w-auto max-w-36 object-contain dark:hidden"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={darkSrc}
                      alt={brandName}
                      className="hidden h-6 w-auto max-w-36 object-contain dark:block"
                    />
                  </>
                ) : (
                  <>
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-md">
                      <Landmark className="size-4" />
                    </div>
                    <span className="text-base font-semibold">{brandName}</span>
                  </>
                )}
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
                {group.items.map((item) =>
                  item.children ? (
                    <Collapsible
                      key={item.href}
                      defaultOpen={hasActiveChild(item, pathname)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton asChild isActive={child.href === activeHref}>
                                  <Link href={child.href}>
                                    <child.icon />
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
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
                  ),
                )}
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
