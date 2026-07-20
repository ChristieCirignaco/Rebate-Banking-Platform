// Field schemas for every CMS component type. The schemaKey stored on a
// CmsComponent row picks its entry here; the admin editor renders the form
// from it and server actions validate against it. Renderers live in
// components/home/sections/ (keyed by component key, falling back to schemaKey).
import type { CmsComponentSchema, CmsFieldDef } from "./types";

const ACCENT_HELP = "Wrap words in [[double brackets]] to highlight them.";

function cta(prefix: string, label: string): CmsFieldDef[] {
  return [
    { key: `${prefix}Label`, label: `${label} label`, type: "text", required: true },
    { key: `${prefix}Href`, label: `${label} link`, type: "url", required: true },
  ];
}

export const CMS_SCHEMAS: Record<string, CmsComponentSchema> = {
  // ---------- site chrome (global components) ----------
  "site-nav": {
    key: "site-nav",
    label: "Site Navigation",
    fields: [
      { key: "signInLabel", label: "Sign-in button label", type: "text", required: true },
      { key: "joinLabel", label: "Join button label", type: "text", required: true },
    ],
    collections: [
      {
        key: "links",
        label: "Menu links",
        itemLabelField: "label",
        fields: [
          { key: "label", label: "Label", type: "text", required: true },
          { key: "href", label: "Link", type: "url", required: true },
        ],
      },
    ],
  },
  "site-footer": {
    key: "site-footer",
    label: "Site Footer",
    fields: [
      { key: "joinLabel", label: "Join button label", type: "text", required: true },
      { key: "quickLinksHeading", label: "Quick links heading", type: "text", required: true },
      { key: "contactHeading", label: "Contact heading", type: "text", required: true },
      { key: "phoneLabel", label: "Phone line label", type: "text" },
      { key: "emailLabel", label: "Email line label", type: "text" },
      { key: "presidentLabel", label: "President email label", type: "text" },
      { key: "presidentEmail", label: "President email address", type: "text" },
      { key: "rightsText", label: "Rights text (after © year + brand)", type: "text" },
    ],
    collections: [
      {
        key: "links",
        label: "Quick links",
        itemLabelField: "label",
        fields: [
          { key: "label", label: "Label", type: "text", required: true },
          { key: "href", label: "Link", type: "url", required: true },
        ],
      },
    ],
  },

  // ---------- home ----------
  hero: {
    key: "hero",
    label: "Home Hero",
    fields: [
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "subheadline", label: "Subheadline", type: "textarea", required: true },
      { key: "videoSrc", label: "Background video", type: "video" },
      { key: "posterImage", label: "Video poster image", type: "image" },
      ...cta("primaryCta", "Primary button"),
      ...cta("secondaryCta", "Secondary button"),
    ],
    collections: [
      {
        key: "badges",
        label: "Trust badges",
        itemLabelField: "text",
        fields: [
          { key: "text", label: "Text", type: "accent", required: true, help: ACCENT_HELP },
          { key: "icon", label: "Icon", type: "icon" },
        ],
      },
      {
        key: "steps",
        label: "Hero steps",
        itemLabelField: "title",
        fields: [
          { key: "icon", label: "Icon", type: "icon", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "textarea", required: true },
        ],
      },
    ],
  },
  "image-message": {
    key: "image-message",
    label: "Image + Message",
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "signature", label: "Signature", type: "text" },
      { key: "image", label: "Image", type: "image", required: true },
      { key: "imageAlt", label: "Image alt text", type: "text" },
    ],
  },
  "steps-section": {
    key: "steps-section",
    label: "Process Steps",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "eyebrowIcon", label: "Eyebrow icon", type: "icon" },
      { key: "heading", label: "Heading", type: "text", required: true },
    ],
    collections: [
      {
        key: "steps",
        label: "Steps",
        itemLabelField: "title",
        fields: [
          { key: "icon", label: "Icon", type: "icon", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "textarea", required: true },
          { key: "accent", label: "Accent color", type: "select", options: ["blue", "emerald"] },
        ],
      },
    ],
  },
  "video-message": {
    key: "video-message",
    label: "Video Message",
    fields: [
      { key: "heading", label: "Heading", type: "accent", required: true, help: ACCENT_HELP },
      { key: "subtext", label: "Subtext", type: "text" },
      { key: "videoSrc", label: "Video", type: "video", required: true },
    ],
  },
  quotes: {
    key: "quotes",
    label: "Quotes",
    creatable: true,
    fields: [{ key: "signature", label: "Signature", type: "text" }],
    collections: [
      {
        key: "quotes",
        label: "Quotes",
        itemLabelField: "text",
        fields: [{ key: "text", label: "Quote", type: "textarea", required: true }],
      },
    ],
  },
  features: {
    key: "features",
    label: "Feature Highlights",
    fields: [
      { key: "eyebrow", label: "Eyebrow (cards layout)", type: "text" },
      { key: "heading", label: "Heading (cards layout)", type: "text" },
    ],
    collections: [
      {
        key: "items",
        label: "Features",
        itemLabelField: "label",
        fields: [
          { key: "icon", label: "Icon", type: "icon", required: true },
          { key: "label", label: "Label", type: "text", required: true },
          { key: "blurb", label: "Blurb (cards layout)", type: "textarea" },
        ],
      },
    ],
  },
  "feature-banner": {
    key: "feature-banner",
    label: "Feature Banner",
    fields: [
      { key: "badge", label: "Badge", type: "text" },
      { key: "heading", label: "Heading", type: "accent", required: true, help: ACCENT_HELP },
      { key: "body", label: "Body", type: "textarea", required: true },
      ...cta("cta", "Button"),
      { key: "image", label: "Image", type: "image", required: true },
      { key: "imageAlt", label: "Image alt text", type: "text" },
    ],
  },
  projects: {
    key: "projects",
    label: "Verified Products",
    fields: [
      { key: "heading", label: "Heading (home layout)", type: "text" },
      { key: "seeAllLabel", label: "See-all label (home layout)", type: "text" },
      { key: "seeAllHref", label: "See-all link", type: "url" },
      { key: "verifiedLabel", label: "Verified badge text", type: "text" },
      ...cta("cardCta", "Card button"),
    ],
    collections: [
      {
        key: "items",
        label: "Products",
        itemLabelField: "title",
        fields: [
          { key: "image", label: "Image", type: "image", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "description", label: "Description (product page)", type: "textarea" },
        ],
      },
    ],
  },
  "stats-banner": {
    key: "stats-banner",
    label: "Stats / Think Big",
    fields: [
      { key: "heading", label: "Heading (home layout)", type: "text" },
      { key: "headingAccent", label: "Heading script accent", type: "text" },
      { key: "body", label: "Body (home layout)", type: "textarea" },
      { key: "backgroundImage", label: "Background image", type: "image" },
    ],
    collections: [
      {
        key: "stats",
        label: "Stats",
        itemLabelField: "label",
        fields: [
          { key: "prefix", label: "Prefix (e.g. $)", type: "text" },
          { key: "value", label: "Value", type: "number", required: true },
          { key: "decimals", label: "Decimals", type: "number" },
          { key: "suffix", label: "Suffix (e.g. B+)", type: "text" },
          { key: "label", label: "Label", type: "text", required: true },
        ],
      },
    ],
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    creatable: true,
    fields: [{ key: "heading", label: "Heading", type: "text", required: true }],
    collections: [
      {
        key: "items",
        label: "Testimonials",
        itemLabelField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "avatar",
            label: "Photo",
            type: "image",
            help: "Optional — cards show the person's initials when empty.",
          },
          { key: "quote", label: "Quote", type: "textarea", required: true },
        ],
      },
    ],
  },
  "blog-teasers": {
    key: "blog-teasers",
    label: "Latest Updates",
    fields: [
      { key: "badge", label: "Badge", type: "text" },
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "fallbackSource", label: "Fallback source name", type: "text" },
    ],
    collections: [
      {
        key: "fallbacks",
        label: "Fallback cards (shown when live news is unreachable)",
        itemLabelField: "title",
        fields: [
          { key: "category", label: "Category", type: "text", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "excerpt", label: "Excerpt", type: "textarea", required: true },
        ],
      },
    ],
  },
  faq: {
    key: "faq",
    label: "FAQ",
    creatable: true,
    fields: [
      { key: "badge", label: "Badge", type: "text" },
      { key: "heading", label: "Heading", type: "text", required: true },
    ],
    collections: [
      {
        key: "items",
        label: "Questions",
        itemLabelField: "question",
        fields: [
          { key: "question", label: "Question", type: "text", required: true },
          { key: "answer", label: "Answer", type: "textarea", required: true },
        ],
      },
    ],
  },

  // ---------- about ----------
  "about-intro": {
    key: "about-intro",
    label: "About Intro",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "image", label: "Image", type: "image", required: true },
      { key: "imageAlt", label: "Image alt text", type: "text" },
      { key: "badgeTop", label: "Floating badge — top line", type: "text" },
      { key: "badgeBottom", label: "Floating badge — bottom line", type: "text" },
      { key: "purposeHeading", label: "List heading", type: "text" },
    ],
    collections: [
      {
        key: "purpose",
        label: "List items",
        itemLabelField: "text",
        fields: [{ key: "text", label: "Text", type: "textarea", required: true }],
      },
    ],
  },
  tabs: {
    key: "tabs",
    label: "Tabbed Content",
    fields: [],
    collections: [
      {
        key: "tabs",
        label: "Tabs",
        itemLabelField: "label",
        fields: [
          { key: "label", label: "Tab label", type: "text", required: true },
          { key: "icon", label: "Icon", type: "icon", required: true },
          {
            key: "accent",
            label: "Accent color",
            type: "select",
            options: ["gold", "sky", "emerald", "red"],
          },
          { key: "heading", label: "Panel heading", type: "text", required: true },
          {
            key: "items",
            label: "Panel points (one per line)",
            type: "lines",
            required: true,
          },
        ],
      },
    ],
  },

  // ---------- contact ----------
  "simple-hero": {
    key: "simple-hero",
    label: "Simple Hero",
    creatable: true,
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "subtext", label: "Subtext", type: "textarea" },
    ],
  },
  "contact-block": {
    key: "contact-block",
    label: "Contact Block",
    fields: [
      { key: "image", label: "Photo", type: "image" },
      { key: "imageAlt", label: "Photo alt text", type: "text" },
      { key: "addressLabel", label: "Address card label", type: "text" },
      { key: "phoneLabel", label: "Phone card label", type: "text" },
      { key: "emailLabel", label: "Email card label", type: "text" },
      { key: "formHeading", label: "Form heading", type: "text" },
      { key: "formSubtext", label: "Form subtext", type: "textarea" },
    ],
  },

  // ---------- product / service / generic ----------
  intro: {
    key: "intro",
    label: "Intro Section",
    creatable: true,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea" },
    ],
  },
  "cta-band": {
    key: "cta-band",
    label: "CTA Band",
    creatable: true,
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea" },
      ...cta("primaryCta", "Primary button"),
      ...cta("secondaryCta", "Secondary button"),
    ],
  },

  // ---------- help ----------
  "support-cards": {
    key: "support-cards",
    label: "Support Cards",
    fields: [],
    collections: [
      {
        key: "items",
        label: "Cards",
        itemLabelField: "title",
        fields: [
          { key: "icon", label: "Icon", type: "icon", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "textarea", required: true },
          {
            key: "kind",
            label: "Link type",
            type: "select",
            options: ["phone", "email", "link"],
            help: "phone/email cards use the numbers set in System Settings and hide automatically when unset.",
          },
          { key: "linkLabel", label: "Link label (for 'link' type)", type: "text" },
          { key: "href", label: "Link (for 'link' type)", type: "url" },
        ],
      },
    ],
  },
  "contact-banner": {
    key: "contact-banner",
    label: "Contact Banner",
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea" },
      ...cta("cta", "Button"),
    ],
  },
  "account-cta": {
    key: "account-cta",
    label: "Account CTA Row",
    fields: [
      { key: "lead", label: "Lead text", type: "text", required: true },
      ...cta("primaryCta", "Primary button"),
      ...cta("secondaryCta", "Secondary button"),
    ],
  },

  // ---------- long-form / privacy ----------
  richtext: {
    key: "richtext",
    label: "Rich Text",
    creatable: true,
    fields: [
      { key: "lastUpdated", label: "Note above the text (optional)", type: "text" },
      { key: "body", label: "Body", type: "richtext", required: true },
    ],
  },
  "policy-contact": {
    key: "policy-contact",
    label: "Policy Contact",
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Intro text", type: "textarea" },
      { key: "phonePrefix", label: "Phone line prefix", type: "text" },
      { key: "emailPrefix", label: "Email line prefix", type: "text" },
      { key: "postPrefix", label: "Post line prefix", type: "text" },
    ],
  },
  "inline-cta": {
    key: "inline-cta",
    label: "Inline CTA Card",
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "text" },
      ...cta("primaryCta", "Primary button"),
      ...cta("secondaryCta", "Secondary button"),
    ],
  },
};

export function getCmsSchema(schemaKey: string): CmsComponentSchema | null {
  return CMS_SCHEMAS[schemaKey] ?? null;
}

// Schemas offered by the admin "Add New Component" flow.
export const CREATABLE_SCHEMAS = Object.values(CMS_SCHEMAS).filter((s) => s.creatable);
