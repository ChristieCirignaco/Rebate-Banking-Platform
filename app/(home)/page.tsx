import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsSections } from "@/components/home/sections/registry";
import { getCmsPage } from "@/lib/home/cms";
import { getMarketingConfig } from "@/lib/home/site-config";

// The landing page's tab title is just the site title — no "· Brand" suffix. `absolute` is what
// makes that stick: without it the site title inherits the root layout's "%s · Brand" template
// and doubles up (e.g. "TRBPAYOUTSUPPORT · TRBPAYOUTSUPPORT"). Sub-pages like /about keep the
// suffix via their own titles + the (home) layout template.
export async function generateMetadata(): Promise<Metadata> {
  const c = await getMarketingConfig();
  return { title: { absolute: c.siteTitle } };
}

// Sections, order, and copy are managed in the admin CMS (/admin/pages); this
// file only decides page-level chrome. Renderers: components/home/sections/.
export default async function Home() {
  const [config, page] = await Promise.all([getMarketingConfig(), getCmsPage("home")]);
  if (!page || !page.isActive) notFound();
  return (
    <main>
      <CmsSections page={page} config={config} />
    </main>
  );
}
