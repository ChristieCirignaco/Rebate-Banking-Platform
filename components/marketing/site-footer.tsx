import Link from "next/link";
import { Phone, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "@/components/marketing/social-icons";
import type { MarketingConfig } from "@/lib/marketing/site-config";

const QUICK_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Contact Us", href: "/contact" },
  { label: "Support", href: "/support" },
];

export function SiteFooter({ config }: { config: MarketingConfig }) {
  return (
    <footer className="bg-[var(--trb-blue)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-8 md:grid-cols-3">
        <div className="max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logo}
            alt={config.brandName}
            className={cn("h-10 w-auto", config.logoIsFallback && "brightness-0 invert")}
          />
          {config.footerText && (
            <p className="mt-5 text-sm leading-relaxed text-white/75">{config.footerText}</p>
          )}
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-white/90"
          >
            Join Now
          </Link>

          {config.socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {config.socials.map(({ key, label, href }) => {
                const Icon = SOCIAL_ICONS[key];
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:justify-self-center">
          <h3 className="text-base font-semibold">Quick Links</h3>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold">Contact Us</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/75">
            {config.supportPhone && (
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-white/60" />
                <span>
                  Support
                  <br />
                  <a href={config.phoneHref} className="transition-colors hover:text-white">
                    {config.supportPhone}
                  </a>
                </span>
              </li>
            )}
            {config.supportEmail && (
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-white/60" />
                <span>
                  Email us any time:
                  <br />
                  <a href={config.emailHref} className="transition-colors hover:text-white">
                    {config.supportEmail}
                  </a>
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <p className="mx-auto max-w-7xl px-6 py-5 text-center text-xs text-white/60 sm:px-8">
          © 2026 {config.brandName}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
