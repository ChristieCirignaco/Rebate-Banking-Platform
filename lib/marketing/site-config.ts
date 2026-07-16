import { getSettings } from "@/lib/settings/store";
import type { SocialKey } from "@/components/marketing/social-icons";

// Marketing pages read their identity (SEO, branding, contact, socials) from the admin
// System Settings (general + branding + legal groups). These fallbacks are the only
// hardcoded values — they keep the public site coherent before an admin configures
// anything; any real value set in /admin/settings overrides them.
const FALLBACK = {
  brandName: "TRBPAYOUTSYSTEM",
  siteTitle: "TRBPAYOUTSYSTEM — Trump Rebate Banking System",
  description:
    "The only verified system where holders of TRB products can register and validate their items.",
  keywords: [
    "TRB",
    "Trump Rebate Banking System",
    "TRB payout",
    "rebate verification",
    "TRB products",
  ],
  supportEmail: "info@trbpayoutsystem.us",
  supportPhone: "+1603-233-1119",
  address: "1600 Pennsylvania Ave NW, Washington, DC 20500",
  footerText:
    "The TRB Payout System is the only verified system where holders of TRB products can register and validate their items.",
  logo: "/marketing/logo.svg",
  ogImage: "/marketing/trump_custom.jpg",
  favicon: "/favicon.ico",
};

export type MarketingSocial = { key: SocialKey; label: string; href: string };

export type MarketingConfig = {
  brandName: string;
  siteTitle: string;
  description: string;
  keywords: string[];
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  footerText: string;
  logo: string;
  logoIsFallback: boolean;
  ogImage: string;
  favicon: string;
  socials: MarketingSocial[];
};

const pick = (value: string | null | undefined, fallback: string) =>
  value && value.trim() ? value.trim() : fallback;

export async function getMarketingConfig(): Promise<MarketingConfig> {
  const [general, branding, legal] = await Promise.all([
    getSettings("general"),
    getSettings("branding"),
    getSettings("legal"),
  ]);

  // Only socials with a configured URL are shown (WhatsApp/Telegram/etc. have no hardcoded
  // default — they appear once an admin sets them in Settings → Legal & Social).
  const socialDefs: MarketingSocial[] = [
    { key: "facebook", label: "Facebook", href: legal.socialFacebook },
    { key: "x", label: "X", href: legal.socialX },
    { key: "instagram", label: "Instagram", href: legal.socialInstagram },
    { key: "linkedin", label: "LinkedIn", href: legal.socialLinkedin },
    { key: "youtube", label: "YouTube", href: legal.socialYoutube },
    { key: "tiktok", label: "TikTok", href: legal.socialTiktok },
    { key: "whatsapp", label: "WhatsApp", href: legal.socialWhatsapp },
    { key: "telegram", label: "Telegram", href: legal.socialTelegram },
  ];
  const socials = socialDefs.filter((s) => s.href && s.href.trim());

  const logo = pick(branding.logoDark ?? branding.logoLight, FALLBACK.logo);

  return {
    brandName: pick(general.brandName, FALLBACK.brandName),
    siteTitle: pick(general.siteTitle, FALLBACK.siteTitle),
    description: pick(general.description, FALLBACK.description),
    keywords: general.seoKeywords?.length ? general.seoKeywords : FALLBACK.keywords,
    siteUrl: general.siteUrl?.trim() ?? "",
    supportEmail: pick(general.supportEmail, FALLBACK.supportEmail),
    supportPhone: pick(general.supportPhone, FALLBACK.supportPhone),
    address: pick(general.address, FALLBACK.address),
    footerText: pick(general.footerText, FALLBACK.footerText),
    logo,
    logoIsFallback: logo === FALLBACK.logo,
    ogImage: pick(branding.ogImage, FALLBACK.ogImage),
    favicon: pick(branding.favicon, FALLBACK.favicon),
    socials,
  };
}
