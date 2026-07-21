// Seed the marketing CMS with the site's canonical content (lib/cms/seed-data.ts).
//
//   npx tsx scripts/seed-cms.ts           # additive: creates missing pages/components only,
//                                         # never touches rows an admin may have edited
//   npx tsx scripts/seed-cms.ts --force   # wipes ALL CMS content and reseeds from scratch
//
// Relative imports on purpose — tsx does not resolve the "@/" alias.
import { PrismaClient, type Prisma } from "@prisma/client";

import { SEED_COMPONENTS, SEED_PAGES, SEED_MENU, SEED_PAGES_BY_SLUG } from "../lib/cms/seed-data";
import { CMS_DEFAULT_LOCALE } from "../lib/cms/types";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

// Menus: build cms_menu_items from the current site-nav/site-footer link collections when a
// location is empty, so an existing install keeps exactly what it shows today (incl. admin
// edits). A fresh install (no such collection rows) uses SEED_MENU. Idempotent per location.
async function seedMenuLocation(location: "header" | "footer", componentKey: string) {
  const existing = await prisma.cmsMenuItem.count({ where: { location } });
  if (existing > 0) return 0;

  const pagesByPath = new Map((await prisma.cmsPage.findMany({ select: { id: true, path: true } })).map((p) => [p.path, p.id]));

  // Live links from the component's "links" collection, if any.
  const comp = await prisma.cmsComponent.findUnique({
    where: { key: componentKey },
    select: { items: { where: { collection: "links" }, orderBy: { sortOrder: "asc" }, select: { contents: { where: { locale: CMS_DEFAULT_LOCALE }, select: { data: true } } } } },
  });
  type Link = { label?: string; href?: string };
  const live: Link[] = (comp?.items ?? [])
    .map((it) => (it.contents[0]?.data ?? {}) as Link)
    .filter((l) => l.href);

  const source: { label: string; href: string }[] = live.length
    ? live.map((l) => ({ label: l.label ?? "", href: l.href! }))
    : SEED_MENU[location].map((m) => ({
        label: m.label ?? "",
        href: m.url ?? (m.pageSlug ? (SEED_PAGES_BY_SLUG.get(m.pageSlug)?.path ?? "") : ""),
      }));

  let order = 0;
  for (const link of source) {
    if (!link.href) continue;
    const pageId = pagesByPath.get(link.href) ?? null;
    await prisma.cmsMenuItem.create({
      data: {
        location,
        label: link.label || null,
        pageId,
        url: pageId ? null : link.href,
        sortOrder: order++,
      },
    });
  }
  return order;
}

async function main() {
  if (force) {
    // Pages cascade their sections; components cascade contents/items. Menu items with a pageId
    // cascade via the CmsPage FK, but custom-link items (pageId = null) don't — delete explicitly
    // so seedMenuLocation's "existing > 0" guard doesn't skip re-backfill on a forced reseed.
    await prisma.cmsPage.deleteMany();
    await prisma.cmsComponent.deleteMany();
    await prisma.cmsMenuItem.deleteMany();
    console.log("--force: cleared existing CMS content");
  }

  let createdComponents = 0;
  for (const c of SEED_COMPONENTS) {
    const existing = await prisma.cmsComponent.findUnique({ where: { key: c.key } });
    if (existing) continue;
    await prisma.cmsComponent.create({
      data: {
        key: c.key,
        name: c.name,
        schemaKey: c.schemaKey,
        type: c.type ?? "static",
        isGlobal: c.isGlobal ?? false,
        isProtected: true,
        contents: {
          create: {
            locale: CMS_DEFAULT_LOCALE,
            data: c.content as Prisma.InputJsonValue,
          },
        },
        items: {
          create: Object.entries(c.collections ?? {}).flatMap(([collection, rows]) =>
            rows.map((data, i) => ({
              collection,
              sortOrder: i,
              contents: {
                create: { locale: CMS_DEFAULT_LOCALE, data: data as Prisma.InputJsonValue },
              },
            })),
          ),
        },
      },
    });
    createdComponents += 1;
  }

  let createdPages = 0;
  for (const [index, p] of SEED_PAGES.entries()) {
    const existing = await prisma.cmsPage.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.cmsPage.create({
      data: {
        slug: p.slug,
        path: p.path,
        title: p.title,
        breadcrumb: p.breadcrumb,
        isProtected: true,
        sortOrder: index,
        sections: {
          create: p.sections.map((key, i) => ({
            sortOrder: i,
            component: { connect: { key } },
          })),
        },
      },
    });
    createdPages += 1;
  }

  const headerItems = await seedMenuLocation("header", "site-nav");
  const footerItems = await seedMenuLocation("footer", "site-footer");

  console.log(
    `CMS seed done: ${createdComponents} component(s), ${createdPages} page(s), ${headerItems} header menu item(s), ` +
      `${footerItems} footer menu item(s) created` +
      (createdComponents + createdPages + headerItems + footerItems === 0 ? " (everything already present)" : ""),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
