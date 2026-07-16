import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Great_Vibes } from "next/font/google";

import "./marketing.css";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["italic"],
  variable: "--font-playfair",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-greatvibes",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TRBPAYOUTSYSTEM — Trump Rebate Banking System",
    template: "%s · TRB Payout System",
  },
  description:
    "The only verified system where holders of TRB products can register and validate their items.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${jakarta.variable} ${playfair.variable} ${greatVibes.variable} flex min-h-screen flex-col bg-[var(--trb-dark)] text-white`}
      style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" }}
    >
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
