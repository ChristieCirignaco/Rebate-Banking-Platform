// Seed the marketing CMS with the site's canonical content (lib/cms/seed-data.ts).
//
//   npx tsx scripts/seed-cms.ts           # additive: creates missing pages/components only,
//                                         # never touches rows an admin may have edited
//   npx tsx scripts/seed-cms.ts --force   # wipes ALL CMS content and reseeds from scratch
//
// Relative imports on purpose — tsx does not resolve the "@/" alias.
import { PrismaClient, type Prisma } from "@prisma/client";

import { SEED_COMPONENTS, SEED_PAGES } from "../lib/cms/seed-data";
import { CMS_DEFAULT_LOCALE } from "../lib/cms/types";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

async function main() {
  if (force) {
    // Pages cascade their sections; components cascade contents/items.
    await prisma.cmsPage.deleteMany();
    await prisma.cmsComponent.deleteMany();
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

  console.log(
    `CMS seed done: ${createdComponents} component(s) and ${createdPages} page(s) created` +
      (createdComponents + createdPages === 0 ? " (everything already present)" : ""),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
