import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SitePluginScripts } from "@/components/site-plugin-scripts";
import { Toaster } from "@/components/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSettings } from "@/lib/settings/store";

// Exposed as --font-sans / --font-geist-mono to match the theme tokens in globals.css.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The brand name is admin-configurable (Settings → General), so the title template that wraps
// every page — and the fallback title for pages that set none — has to be read at request time,
// not hardcoded. This mirrors app/admin/layout.tsx and app/(home)/layout.tsx; before this it was
// a static "Rebate Bank", which is why a renamed brand still showed "· Rebate Bank" in the tab.
export async function generateMetadata(): Promise<Metadata> {
  const general = await getSettings("general");
  const brand = general.brandName || general.siteTitle || "Rebate Bank";
  return {
    title: { default: brand, template: `%s · ${brand}` },
    description:
      general.description ||
      "Submit your purchases, earn rebates to your wallet, and withdraw — a clean, legitimate rebate platform.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        <Toaster />
        {/* Admin-configured Analytics/Chat tags (Settings → Plugins). Renders nothing unless
            enabled. A plain settings read, so static pages stay static and pick it up on their
            revalidation cycle. */}
        <SitePluginScripts />
      </body>
    </html>
  );
}
