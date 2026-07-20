import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/home/primitives/page-hero";
import { CmsSections } from "@/components/home/sections/registry";
import { getCmsPage } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("help");
  return { title: page?.title ?? "Support" };
}

export default async function SupportPage() {
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage("help")]);
  if (!page || !page.isActive) notFound();
  return (
    <main>
      {page.breadcrumb && <PageHero title={page.title} breadcrumb={page.breadcrumb} variant="dark" />}
      {/* Help sections render as blocks inside one shared white container. */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
          <CmsSections page={page} config={config} />
        </div>
      </section>
    </main>
  );
}
