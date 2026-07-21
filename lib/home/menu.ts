import { cache } from "react";

import { prisma } from "@/lib/db";
import { SEED_MENU, SEED_PAGES_BY_SLUG, type SeedMenuItem } from "@/lib/cms/seed-data";

export type MenuLocation = "header" | "footer";
export type MenuLink = { label: string; href: string; openInNew: boolean };

// Seed fallback: only when the table is legitimately empty. A page-slug seed item resolves to
// its seeded path; a slug with no seed page is dropped rather than linking to nothing.
function seedMenu(location: MenuLocation): MenuLink[] {
  return SEED_MENU[location]
    .map((item: SeedMenuItem): MenuLink | null => {
      if (item.url) return { label: item.label ?? item.url, href: item.url, openInNew: Boolean(item.openInNew) };
      const page = item.pageSlug ? SEED_PAGES_BY_SLUG.get(item.pageSlug) : undefined;
      if (!page) return null;
      return { label: item.label ?? page.title, href: page.path, openInNew: Boolean(item.openInNew) };
    })
    .filter((l): l is MenuLink => Boolean(l));
}

// Resolve a location's menu. Page-links whose page is inactive/gone are skipped. On a transient
// DB error we THROW (so ISR keeps the last-good copy); a genuinely empty table falls back to seed.
export const getMenu = cache(async (location: MenuLocation): Promise<MenuLink[]> => {
  let rows: { label: string | null; url: string | null; openInNew: boolean; page: { title: string; path: string; isActive: boolean } | null }[];
  try {
    rows = await prisma.cmsMenuItem.findMany({
      where: { location, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        label: true,
        url: true,
        openInNew: true,
        page: { select: { title: true, path: true, isActive: true } },
      },
    });
  } catch (error) {
    // A configured DB that errors is transient — rethrow so the last good render is kept, rather
    // than caching a seed/empty menu as if it were real.
    throw error;
  }
  if (rows.length === 0) return seedMenu(location);

  const links: MenuLink[] = [];
  for (const row of rows) {
    if (row.page) {
      if (!row.page.isActive) continue; // page-link to a deactivated page → hidden
      links.push({ label: row.label?.trim() || row.page.title, href: row.page.path, openInNew: row.openInNew });
    } else if (row.url) {
      links.push({ label: row.label?.trim() || row.url, href: row.url, openInNew: row.openInNew });
    }
  }
  return links;
});
