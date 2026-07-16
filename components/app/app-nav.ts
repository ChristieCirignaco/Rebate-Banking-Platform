import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  HandCoins,
  House,
  LifeBuoy,
  Package,
  Receipt,
  Send,
  Ticket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// The single source of truth for the user-area navigation, shared by the desktop sidebar and
// the mobile drawer so they can never drift.
export const APP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/products", label: "Products", icon: Package },
  { href: "/send", label: "Send Money", icon: Send },
  { href: "/deposit", label: "Deposit Money", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdrawals", icon: ArrowUpFromLine },
  { href: "/request", label: "Request Money", icon: HandCoins },
  { href: "/exchange", label: "Exchange Money", icon: ArrowLeftRight },
  { href: "/voucher", label: "Voucher", icon: Ticket },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/support", label: "Support", icon: LifeBuoy },
];
