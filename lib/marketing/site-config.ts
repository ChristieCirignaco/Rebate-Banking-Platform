import { cache } from "react";

import { getSettings } from "@/lib/settings/store";
import type { SocialKey } from "@/components/marketing/social-icons";

// The marketing site's configurable identity — SEO, branding, contact details, socials — comes
// entirely from the admin System Settings (general + branding + legal groups). The ONLY
// hardcoded values here are the structural asset fallbacks (a bundled logo/favicon) so the
// chrome never renders without one; every brand / contact / SEO value is settings-driven.
const DEFAULT_LOGO = "/marketing/logo.svg";
const DEFAULT_FAVICON = "/favicon.ico";

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
  addressLines: string[];
  phoneHref: string;
  emailHref: string;
  footerText: string;
  logo: string;
  logoIsFallback: boolean;
  ogImage: string;
  favicon: string;
  socials: MarketingSocial[];
};

const clean = (v: string | null | undefined) => (v ? v.trim() : "");

// Memoized per request so generateMetadata and the layout/pages share one read + merge.
export const getMarketingConfig = cache(async (): Promise<MarketingConfig> => {
  const [general, branding, legal] = await Promise.all([
    getSettings("general"),
    getSettings("branding"),
    getSettings("legal"),
  ]);

  const socialDefs: MarketingSocial[] = [
    { key: "facebook", label: "Facebook", href: clean(legal.socialFacebook) },
    { key: "x", label: "X", href: clean(legal.socialX) },
    { key: "instagram", label: "Instagram", href: clean(legal.socialInstagram) },
    { key: "linkedin", label: "LinkedIn", href: clean(legal.socialLinkedin) },
    { key: "youtube", label: "YouTube", href: clean(legal.socialYoutube) },
    { key: "tiktok", label: "TikTok", href: clean(legal.socialTiktok) },
    { key: "whatsapp", label: "WhatsApp", href: clean(legal.socialWhatsapp) },
    { key: "telegram", label: "Telegram", href: clean(legal.socialTelegram) },
  ];
  const socials = socialDefs.filter((s) => s.href);

  const logo = clean(branding.logoDark) || clean(branding.logoLight) || DEFAULT_LOGO;
  const supportEmail = clean(general.supportEmail);
  const supportPhone = clean(general.supportPhone);
  const address = clean(general.address);

  return {
    brandName: clean(general.brandName),
    siteTitle: clean(general.siteTitle),
    description: clean(general.description),
    keywords: general.seoKeywords ?? [],
    siteUrl: clean(general.siteUrl),
    supportEmail,
    supportPhone,
    address,
    addressLines: address
      ? address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : [],
    phoneHref: supportPhone ? `tel:${supportPhone.replace(/[^\d+]/g, "")}` : "",
    emailHref: supportEmail ? `mailto:${supportEmail}` : "",
    footerText: clean(general.footerText),
    logo,
    logoIsFallback: logo === DEFAULT_LOGO,
    ogImage: clean(branding.ogImage),
    favicon: clean(branding.favicon) || DEFAULT_FAVICON,
    socials,
  };
});
