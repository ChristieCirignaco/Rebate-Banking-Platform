// Section-renderer registry. Resolution order for a section on a page:
//   1. page-specific variant  ("about:think-big" — stats band instead of the home banner)
//   2. component-key renderer ("hero", "redemption", …)
//   3. schema fallback        (generic layout for admin-created components)
// Global chrome components (site-nav / site-footer) never render as sections.
import type { ComponentType } from "react";

import type { CmsComponentData, CmsPageData } from "@/lib/cms/types";
import type { SectionProps } from "./section-props";
import {
  BlogTeasersSection,
  CashoutProcessHomeSection,
  DualQuoteSection,
  FaqSection,
  FeatureBannerSection,
  FeaturesStripSection,
  HeroSection,
  ImageMessageSection,
  ProjectsHomeSection,
  StatsBannerSection,
  TestimonialsSection,
  VideoMessageSection,
} from "./home";
import {
  AboutIntroSection,
  RedemptionSection,
  StatsBandSection,
  TabsSection,
} from "./about";
import {
  AccountCtaBlock,
  AccountCtaStandalone,
  ContactBannerBlock,
  ContactBannerStandalone,
  ContactBlockSection,
  CtaBandSection,
  FeatureCardsSection,
  GenericIntroSection,
  HelpIntroBlock,
  InlineCtaBlock,
  InlineCtaStandalone,
  PolicyContactBlock,
  PolicyContactStandalone,
  ProductIntroSection,
  ProjectsGridSection,
  RichTextBlock,
  RichTextStandalone,
  ServiceIntroSection,
  SimpleHeroSection,
  StepsCardsSection,
  SupportCardsBlock,
  SupportCardsStandalone,
} from "./misc";
import { DocumentsSection } from "./documents";

type Renderer = ComponentType<SectionProps>;

const BY_PAGE: Record<string, Renderer> = {
  "about:think-big": StatsBandSection,
  "service:cashout-process": StepsCardsSection,
  "service:features": FeatureCardsSection,
};

const BY_KEY: Record<string, Renderer> = {
  hero: HeroSection,
  "trump-message": ImageMessageSection,
  "cashout-process": CashoutProcessHomeSection,
  "video-message": VideoMessageSection,
  "dual-quote": DualQuoteSection,
  features: FeaturesStripSection,
  "success-story": FeatureBannerSection,
  projects: ProjectsHomeSection,
  "think-big": StatsBannerSection,
  testimonials: TestimonialsSection,
  "blog-teasers": BlogTeasersSection,
  faq: FaqSection,
  "about-intro": AboutIntroSection,
  "about-tabs": TabsSection,
  redemption: RedemptionSection,
  "contact-hero": SimpleHeroSection,
  "contact-block": ContactBlockSection,
  "product-intro": ProductIntroSection,
  "product-cta": CtaBandSection,
  "service-intro": ServiceIntroSection,
  "service-cta": CtaBandSection,
  "help-intro": HelpIntroBlock,
  "support-cards": SupportCardsBlock,
  "help-contact-banner": ContactBannerBlock,
  "help-account-cta": AccountCtaBlock,
  "privacy-body": RichTextBlock,
  "privacy-contact": PolicyContactBlock,
  "privacy-cta": InlineCtaBlock,
};

// The product page renders "projects" as a detail grid instead of the home rail.
const PRODUCT_OVERRIDES: Record<string, Renderer> = {
  "product:projects": ProjectsGridSection,
};

const BY_SCHEMA: Record<string, Renderer> = {
  documents: DocumentsSection,
  hero: HeroSection,
  "image-message": ImageMessageSection,
  "steps-section": StepsCardsSection,
  "video-message": VideoMessageSection,
  quotes: DualQuoteSection,
  features: FeatureCardsSection,
  "feature-banner": FeatureBannerSection,
  projects: ProjectsHomeSection,
  "stats-banner": StatsBannerSection,
  testimonials: TestimonialsSection,
  "blog-teasers": BlogTeasersSection,
  faq: FaqSection,
  "about-intro": AboutIntroSection,
  tabs: TabsSection,
  "simple-hero": SimpleHeroSection,
  "contact-block": ContactBlockSection,
  intro: GenericIntroSection,
  "cta-band": CtaBandSection,
  "support-cards": SupportCardsStandalone,
  "contact-banner": ContactBannerStandalone,
  "account-cta": AccountCtaStandalone,
  richtext: RichTextStandalone,
  "policy-contact": PolicyContactStandalone,
  "inline-cta": InlineCtaStandalone,
};

export function resolveSectionRenderer(
  pageSlug: string,
  section: CmsComponentData,
): Renderer | null {
  if (section.schemaKey === "site-nav" || section.schemaKey === "site-footer") return null;
  return (
    PRODUCT_OVERRIDES[`${pageSlug}:${section.key}`] ??
    BY_PAGE[`${pageSlug}:${section.key}`] ??
    BY_KEY[section.key] ??
    BY_SCHEMA[section.schemaKey] ??
    null
  );
}

export function CmsSections({
  page,
  config,
}: {
  page: CmsPageData;
  config: SectionProps["config"];
}) {
  return (
    <>
      {page.sections.map((section) => {
        const Renderer = resolveSectionRenderer(page.slug, section);
        if (!Renderer) return null;
        return <Renderer key={section.key} data={section} page={page} config={config} />;
      })}
    </>
  );
}
