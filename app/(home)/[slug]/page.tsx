import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/home/primitives/page-hero";
import { CmsSections } from "@/components/home/sections/registry";
import { SEED_PAGES_BY_SLUG } from "@/lib/cms/seed-data";
import { getCmsPage, getCustomCmsPageSlugs } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

// Admin-created CMS pages (Page Manager → Create Page). Core marketing pages
// have dedicated routes above; this catch-all serves only custom slugs.
export async function generateStaticParams() {
  return (await getCustomCmsPageSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (SEED_PAGES_BY_SLUG.has(slug)) return {};
  const page = await getCmsPage(slug);
  return page ? { title: page.title } : {};
}

export default async function CmsCustomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (SEED_PAGES_BY_SLUG.has(slug)) notFound();
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage(slug)]);
  if (!page || page.id === null || !page.isActive) notFound();
  return (
    <main>
      {page.breadcrumb ? (
        <PageHero title={page.title} breadcrumb={page.breadcrumb} variant="dark" />
      ) : (
        // The site header is fixed (h-20) and styled for a dark backdrop — give
        // breadcrumb-less pages a dark spacer so the first section clears it.
        <div className="h-24 bg-[var(--trb-dark)]" aria-hidden />
      )}
      <CmsSections page={page} config={config} />
    </main>
  );
}
