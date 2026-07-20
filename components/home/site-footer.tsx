import Link from "next/link";
import { Phone, Mail, Mails } from "lucide-react";

import { cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "@/components/home/social-icons";
import { cmsText, type CmsComponentData } from "@/lib/cms/types";
import type { MarketingConfig } from "@/lib/home/site-config";

// Labels + quick links come from the CMS "site-footer" component; contact
// values (phone/email/socials/description) stay on admin System Settings.
export function SiteFooter({
  config,
  data,
}: {
  config: MarketingConfig;
  data: CmsComponentData | null;
}) {
  const c = data?.content ?? {};
  const quickLinks = (data?.collections.links ?? []).map((l) => ({
    label: cmsText(l.data, "label"),
    href: cmsText(l.data, "href", "/"),
  }));
  const presidentEmail = cmsText(c, "presidentEmail");
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
          <p className="mt-4 text-sm text-white-500">{config.description}</p>
          {config.footerText && (
            <p className="mt-5 text-sm leading-relaxed text-white/75">{config.footerText}</p>
          )}
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-white/90"
          >
            {cmsText(c, "joinLabel", "Join Now")}
          </Link>
        </div>

        <div className="md:justify-self-center">
          <h3 className="text-base font-semibold">{cmsText(c, "quickLinksHeading", "Quick Links")}</h3>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold">{cmsText(c, "contactHeading", "Contact Us")}</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/75">
            {config.supportPhone && (
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-white/60" />
                <span>
                  {cmsText(c, "phoneLabel", "Support")}
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
                  {cmsText(c, "emailLabel", "Email us any time:")}
                  <br />
                  <a href={config.emailHref} className="transition-colors hover:text-white">
                    {config.supportEmail}
                  </a>
                </span>
              </li>
            )}
            {presidentEmail && (
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Mails className="mt-0.5 h-5 w-5 shrink-0 text-white/60" />
                <span>
                  {cmsText(c, "presidentLabel", "Email the President's office:")}
                  <br />
                  <a href={`mailto:${presidentEmail}`} className="transition-colors hover:text-white">
                    {presidentEmail}
                  </a>
                </span>
              </li>
            )}

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
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <p className="mx-auto max-w-7xl px-6 py-5 text-center text-xs text-white/60 sm:px-8">
          © {new Date().getFullYear()} {config.brandName}. {cmsText(c, "rightsText", "All Rights Reserved.")}
        </p>
      </div>
    </footer>
  );
}
