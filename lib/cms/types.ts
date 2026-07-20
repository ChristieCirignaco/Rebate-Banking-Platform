// Marketing CMS core types — shared by the admin editors (client), the public
// read layer (server), and the seed script. Keep this module dependency-free.

export const CMS_DEFAULT_LOCALE = "en";

// How a field is edited in the admin and validated on save:
// - "accent"  : single-line text where [[...]] spans render with the section's
//               accent style (gold/bold) — lets admins keep highlighted words.
// - "richtext": sanitized HTML from the in-house editor (dynamic components).
// - "lines"   : string[] edited as a one-item-per-line textarea.
// - "icon"    : one of the curated names in lib/cms/icons.
export type CmsFieldType =
  | "text"
  | "textarea"
  | "accent"
  | "richtext"
  | "image"
  | "video"
  | "url"
  | "number"
  | "icon"
  | "select"
  | "lines";

export type CmsFieldDef = {
  key: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
  options?: string[]; // for type "select"
  help?: string; // short admin hint
};

export type CmsCollectionDef = {
  key: string; // e.g. "items", "badges", "steps"
  label: string;
  itemLabelField: string; // which field names an item in the admin list
  fields: CmsFieldDef[];
};

export type CmsComponentSchema = {
  key: string; // schemaKey stored on CmsComponent
  label: string;
  fields: CmsFieldDef[];
  collections?: CmsCollectionDef[];
  // Admin "Add New" may create more instances of this schema (they render via
  // the generic per-schema renderers, so they work on any page).
  creatable?: boolean;
};

export type CmsFieldValue = string | number | string[] | null | undefined;
export type CmsData = Record<string, CmsFieldValue>;

export type CmsItem = { id: string; data: CmsData };

export type CmsComponentData = {
  id: string | null; // null when served purely from seed fallback (unseeded DB)
  key: string;
  name: string;
  schemaKey: string;
  type: "static" | "dynamic";
  isActive: boolean;
  content: CmsData;
  collections: Record<string, CmsItem[]>;
};

export type CmsPageData = {
  id: string | null;
  slug: string;
  path: string;
  title: string;
  breadcrumb: string | null;
  isActive: boolean;
  sections: CmsComponentData[];
};

// ---- small typed readers used by section renderers and admin previews ----

export function cmsText(data: CmsData, key: string, fallback = ""): string {
  const v = data[key];
  return typeof v === "string" ? v : fallback;
}

export function cmsNum(data: CmsData, key: string, fallback = 0): number {
  const v = data[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

export function cmsLines(data: CmsData, key: string): string[] {
  const v = data[key];
  if (Array.isArray(v)) return v.filter((s): s is string => typeof s === "string");
  return [];
}
