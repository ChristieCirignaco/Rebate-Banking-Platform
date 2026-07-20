// Public read layer for the marketing CMS. Server-only; per-request memoized
// like getMarketingConfig. Reads are resilient: a missing row (or an unreachable
// database) falls back to the canonical copy in lib/cms/seed-data.ts, so the
// marketing site can never render blank sections.
import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  CMS_DEFAULT_LOCALE,
  type CmsComponentData,
  type CmsData,
  type CmsItem,
  type CmsPageData,
} from "@/lib/cms/types";
import {
  SEED_COMPONENTS_BY_KEY,
  SEED_PAGES_BY_SLUG,
  type SeedComponent,
} from "@/lib/cms/seed-data";

const componentInclude = {
  contents: true,
  items: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { contents: true },
  },
} satisfies Prisma.CmsComponentInclude;

type ComponentRow = Prisma.CmsComponentGetPayload<{ include: typeof componentInclude }>;

function fallbackComponent(seed: SeedComponent): CmsComponentData {
  return {
    id: null,
    key: seed.key,
    name: seed.name,
    schemaKey: seed.schemaKey,
    type: seed.type ?? "static",
    isActive: true,
    content: { ...seed.content },
    collections: Object.fromEntries(
      Object.entries(seed.collections ?? {}).map(([collection, rows]) => [
        collection,
        rows.map((data, i) => ({ id: `seed-${seed.key}-${collection}-${i}`, data })),
      ]),
    ),
  };
}

function localeData(
  contents: { locale: string; data: Prisma.JsonValue }[],
  locale: string,
): CmsData {
  const row =
    contents.find((c) => c.locale === locale) ??
    contents.find((c) => c.locale === CMS_DEFAULT_LOCALE);
  return ((row?.data as CmsData | undefined) ?? {}) as CmsData;
}

function toComponentData(row: ComponentRow, locale: string): CmsComponentData {
  // Seed values fill in field keys a DB row doesn't have yet (schema evolution);
  // collections come from the DB alone once the row exists, so admin deletions stick.
  const seed = SEED_COMPONENTS_BY_KEY.get(row.key);
  const collections: Record<string, CmsItem[]> = {};
  for (const item of row.items) {
    (collections[item.collection] ??= []).push({
      id: item.id,
      data: localeData(item.contents, locale),
    });
  }
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    schemaKey: row.schemaKey,
    type: row.type === "dynamic" ? "dynamic" : "static",
    isActive: row.isActive,
    content: { ...(seed?.content ?? {}), ...localeData(row.contents, locale) },
    collections,
  };
}

export const getCmsComponent = cache(
  async (key: string, locale: string = CMS_DEFAULT_LOCALE): Promise<CmsComponentData | null> => {
    let row: ComponentRow | null = null;
    let failed = false;
    try {
      row = await prisma.cmsComponent.findUnique({ where: { key }, include: componentInclude });
    } catch {
      failed = true;
    }
    if (!row) {
      const seed = SEED_COMPONENTS_BY_KEY.get(key);
      if (seed) return fallbackComponent(seed);
      // A transient DB error must fail the render (ISR then keeps serving the
      // last good copy) instead of being mistaken for "component deleted".
      if (failed) throw new Error(`CMS unavailable while loading component "${key}"`);
      return null;
    }
    if (!row.isActive) return null;
    return toComponentData(row, locale);
  },
);

function fallbackPage(slug: string): CmsPageData | null {
  const seed = SEED_PAGES_BY_SLUG.get(slug);
  if (!seed) return null;
  return {
    id: null,
    slug: seed.slug,
    path: seed.path,
    title: seed.title,
    breadcrumb: seed.breadcrumb,
    isActive: true,
    sections: seed.sections
      .map((key) => SEED_COMPONENTS_BY_KEY.get(key))
      .filter((c): c is SeedComponent => Boolean(c))
      .map(fallbackComponent),
  };
}

export const getCmsPage = cache(
  async (slug: string, locale: string = CMS_DEFAULT_LOCALE): Promise<CmsPageData | null> => {
    let row = null;
    let failed = false;
    try {
      row = await prisma.cmsPage.findUnique({
        where: { slug },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { component: { include: componentInclude } },
          },
        },
      });
    } catch {
      failed = true;
    }
    if (!row) {
      const fallback = fallbackPage(slug);
      if (fallback) return fallback;
      // Admin-created pages have no seed fallback: on a transient DB error,
      // fail the render (ISR keeps the last good copy) rather than returning
      // null — which the routes turn into a notFound() that ISR would cache.
      if (failed) throw new Error(`CMS unavailable while loading page "${slug}"`);
      return null;
    }
    return {
      id: row.id,
      slug: row.slug,
      path: row.path,
      title: row.title,
      breadcrumb: row.breadcrumb,
      isActive: row.isActive,
      sections: row.sections
        .filter((s) => s.isActive && s.component.isActive)
        .map((s) => toComponentData(s.component, locale)),
    };
  },
);

// Admin-created pages (non-seeded) rendered by the catch-all route.
export const getCustomCmsPageSlugs = cache(async (): Promise<string[]> => {
  try {
    const rows = await prisma.cmsPage.findMany({
      where: { isActive: true, isProtected: false },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
});
