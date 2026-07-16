import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { PageHero } from "@/components/marketing/primitives/page-hero";
import { getMarketingConfig } from "@/lib/marketing/site-config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPolicyPage() {
  const config = await getMarketingConfig();
  return (
    <main>
      <PageHero title="Privacy Policy" breadcrumb="Privacy policy" variant="dark" />

      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
          <Reveal>
            <p className="text-sm font-medium text-slate-500">Last updated: July 2026</p>

            <div className="mt-8 space-y-10 text-[15px] leading-[1.85] text-slate-600">
              {/* Introduction */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">1. Introduction</h2>
                <p className="mt-4">
                  Welcome to the Trump Rebate Banking (TRB) verification portal. We are committed to
                  protecting your personal information and your right to privacy. This Privacy Policy
                  explains what information we collect when you visit our website and use our
                  services, how we use it, and the rights you have in relation to it.
                </p>
                <p className="mt-4">
                  Please note that this platform is a product-verification and recognition portal.
                  It is <strong className="text-[var(--trb-dark)]">not a bank and does not handle
                  actual cash transactions</strong>. We seek to explain, in the clearest way
                  possible, exactly how your information is handled so you can use our services with
                  confidence.
                </p>
              </div>

              {/* Information We Collect */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">2. Information We Collect</h2>
                <p className="mt-4">
                  We collect personal information that you voluntarily provide to us when you
                  register for an account, submit a TRB product for verification, or otherwise
                  contact us. The information we collect depends on the context of your interactions
                  with us and the choices you make, and may include:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  <li>Name and contact data, such as your email address and phone number.</li>
                  <li>Account credentials and identifiers used to secure your portal access.</li>
                  <li>Details and images of the TRB products you submit for verification.</li>
                  <li>Technical data, such as your device type, browser, and usage information.</li>
                </ul>
              </div>

              {/* How We Use Your Information */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">3. How We Use Your Information</h2>
                <p className="mt-4">
                  We use the personal information collected via our website for a variety of business
                  purposes, in reliance on our legitimate business interests, to perform our services
                  for you, with your consent, and to comply with our legal obligations. Specifically,
                  we use your information to:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  <li>Facilitate account creation and the secure log-in process.</li>
                  <li>Review, validate, and manage your product-verification requests.</li>
                  <li>Send you administrative information and status updates.</li>
                  <li>Respond to your inquiries and provide support.</li>
                  <li>Protect our services and prevent fraudulent or unauthorized activity.</li>
                </ul>
              </div>

              {/* Data Protection & Security */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">4. Data Protection &amp; Security</h2>
                <p className="mt-4">
                  We have implemented appropriate technical and organizational security measures
                  designed to protect the security of any personal information we process. However,
                  please remember that no method of transmission over the internet is 100% secure.
                  Although we do our best to protect your personal information, transmission to and
                  from our website is at your own risk, and you should only access our services within
                  a secure environment.
                </p>
                <p className="mt-4">
                  We retain your personal information only for as long as necessary to fulfil the
                  purposes set out in this policy, unless a longer retention period is required or
                  permitted by law.
                </p>
              </div>

              {/* Cookies */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">5. Cookies &amp; Tracking Technologies</h2>
                <p className="mt-4">
                  We may use cookies and similar tracking technologies to access or store information.
                  These help us keep you signed in, remember your preferences, and understand how our
                  portal is used so we can improve it. You can set your browser to refuse cookies or
                  to alert you when cookies are being sent; however, some parts of the website may not
                  function properly without them.
                </p>
              </div>

              {/* Third-Party Services */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">6. Third-Party Services</h2>
                <p className="mt-4">
                  We only share information with your consent, to comply with applicable laws, to
                  provide you with our services, to protect your rights, or to fulfil legitimate
                  business obligations. We do{" "}
                  <strong className="text-[var(--trb-dark)]">not sell or rent</strong> your personal
                  information to third parties for marketing purposes. Where we rely on trusted
                  service providers to operate our portal, they are permitted to use your information
                  only as necessary to perform services on our behalf.
                </p>
              </div>

              {/* Your Rights */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">7. Your Privacy Rights</h2>
                <p className="mt-4">
                  Depending on your location, you may have certain rights regarding your personal
                  information, including the right to:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  <li>Request access to and a copy of the information we hold about you.</li>
                  <li>Request that we correct or update inaccurate information.</li>
                  <li>Request that we delete your personal information, subject to legal limits.</li>
                  <li>Withdraw your consent at any time where we rely on it to process your data.</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, please contact us using the details below.
                </p>
              </div>

              {/* Changes to This Policy */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">8. Changes to This Policy</h2>
                <p className="mt-4">
                  We may update this Privacy Policy from time to time. The updated version will be
                  indicated by a revised &ldquo;Last updated&rdquo; date and will be effective as soon
                  as it is accessible. We encourage you to review this policy periodically to stay
                  informed about how we protect your information.
                </p>
              </div>

              {/* Contact Us */}
              <div>
                <h2 className="text-2xl font-bold text-[var(--trb-blue)]">9. Contact Us</h2>
                <p className="mt-4">
                  If you have questions or comments about this policy, you may reach us by phone, by
                  email, or by post:
                </p>
                <ul className="mt-4 space-y-2">
                  {config.supportPhone && (
                    <li>
                      Phone:{" "}
                      <a href={config.phoneHref} className="font-semibold text-[var(--trb-blue)] hover:underline">
                        {config.supportPhone}
                      </a>
                    </li>
                  )}
                  {config.supportEmail && (
                    <li>
                      Email:{" "}
                      <a href={config.emailHref} className="font-semibold text-[var(--trb-blue)] hover:underline">
                        {config.supportEmail}
                      </a>
                    </li>
                  )}
                  {config.address && <li>Post: {config.address}</li>}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-14 flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-slate-50 p-8">
              <div className="mr-auto">
                <h3 className="text-lg font-bold text-[var(--trb-dark)]">Ready to verify your TRB product?</h3>
                <p className="mt-1 text-sm text-slate-600">Create your secure portal access in minutes.</p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--trb-blue)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
              >
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[var(--trb-blue)]/30 px-6 py-3 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[var(--trb-blue)]/5"
              >
                Login
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
