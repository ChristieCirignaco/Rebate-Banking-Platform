import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/home/primitives/page-hero";
import { CmsSections } from "@/components/home/sections/registry";
import { getCmsPage } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("privacy-policy");
  return { title: page?.title ?? "Privacy Policy" };
}

export default async function PrivacyPolicyPage() {
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage("privacy-policy")]);
  if (!page || !page.isActive) notFound();
  return (
    <main>
      {page.breadcrumb && <PageHero title={page.title} breadcrumb={page.breadcrumb} variant="dark" />}
      {/* Policy sections render as blocks inside one narrow document container. */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
          <CmsSections page={page} config={config} />
        </div>
      </section>
    </main>
  );
}
