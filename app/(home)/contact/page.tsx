import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsSections } from "@/components/home/sections/registry";
import { getCmsPage } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("contact");
  return { title: page?.title ?? "Contact Us" };
}

export default async function ContactPage() {
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage("contact")]);
  if (!page || !page.isActive) notFound();
  return (
    <main>
      <CmsSections page={page} config={config} />
    </main>
  );
}
