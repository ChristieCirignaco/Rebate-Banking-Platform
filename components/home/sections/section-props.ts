import type { CmsComponentData, CmsPageData } from "@/lib/cms/types";
import type { MarketingConfig } from "@/lib/home/site-config";

// Every section renderer receives the component's CMS data plus the page and
// site config it renders within. Renderers are server components.
export type SectionProps = {
  data: CmsComponentData;
  page: CmsPageData;
  config: MarketingConfig;
};
