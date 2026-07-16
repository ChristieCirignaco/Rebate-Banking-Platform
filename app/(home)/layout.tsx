import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Great_Vibes } from "next/font/google";

import "./marketing.css";
import { SiteHeader } from "@/components/home/site-header";
import { SiteFooter } from "@/components/home/site-footer";
import { getMarketingConfig } from "@/lib/home/site-config";

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

// ISR: every marketing route regenerates at most every 5 minutes, so admin System Settings
// changes appear within 5 min in production and the home "Latest Updates" news stays fresh —
// without a per-request DB hit on every visit.
export const revalidate = 300;

// SEO/OG/title/favicon all come from the admin System Settings (general + branding).
function safeUrl(value: string): URL | undefined {
  try {
    return value ? new URL(value) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMarketingConfig();
  return {
    metadataBase: safeUrl(c.siteUrl),
    title: { default: c.siteTitle, template: `%s · ${c.brandName}` },
    description: c.description,
    keywords: c.keywords,
    icons: { icon: c.favicon },
    openGraph: {
      type: "website",
      title: c.siteTitle,
      description: c.description,
      siteName: c.brandName,
      url: c.siteUrl || undefined,
      images: c.ogImage ? [{ url: c.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: c.siteTitle,
      description: c.description,
      images: c.ogImage ? [c.ogImage] : undefined,
    },
  };
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getMarketingConfig();
  return (
    <div
      className={`${jakarta.variable} ${playfair.variable} ${greatVibes.variable} flex min-h-screen flex-col bg-[var(--trb-dark)] text-white`}
      style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" }}
    >
      <SiteHeader logoUrl={config.logo} brandName={config.brandName} />
      <div className="flex-1">{children}</div>
      <SiteFooter config={config} />
    </div>
  );
}
