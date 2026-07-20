import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/home/primitives/page-hero";
import { CmsSections } from "@/components/home/sections/registry";
import { getCmsPage } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("product");
  return { title: page?.title ?? "Product" };
}

export default async function ProductPage() {
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage("product")]);
  if (!page || !page.isActive) notFound();
  return (
    <main>
      {page.breadcrumb && <PageHero title={page.title} breadcrumb={page.breadcrumb} variant="dark" />}
      <CmsSections page={page} config={config} />
    </main>
  );
}
