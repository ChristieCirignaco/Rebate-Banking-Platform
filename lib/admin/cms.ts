// Server data functions for the admin Page Manager / Component Manager.
// Auth is enforced by the admin layout + every server action, not here.
import { prisma } from "@/lib/db";
import { CMS_DEFAULT_LOCALE, type CmsData } from "@/lib/cms/types";
import { getCmsSchema } from "@/lib/cms/schemas";

export type CmsPageListRow = {
  id: string;
  slug: string;
  path: string;
  title: string;
  isActive: boolean;
  isProtected: boolean;
  sectionCount: number;
  updatedAt: string;
};

export async function getCmsPagesList(): Promise<CmsPageListRow[]> {
  const rows = await prisma.cmsPage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sections: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    path: r.path,
    title: r.title,
    isActive: r.isActive,
    isProtected: r.isProtected,
    sectionCount: r._count.sections,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export type CmsSectionRow = {
  id: string;
  sortOrder: number;
  isActive: boolean;
  component: {
    id: string;
    key: string;
    name: string;
    schemaKey: string;
    schemaLabel: string;
    type: string;
    isActive: boolean;
  };
};

export type CmsPageDetailData = {
  id: string;
  slug: string;
  path: string;
  title: string;
  breadcrumb: string | null;
  isActive: boolean;
  isProtected: boolean;
  sections: CmsSectionRow[];
  // Components not yet on this page (the add-to-page library).
  library: { id: string; key: string; name: string; schemaKey: string; schemaLabel: string; type: string }[];
};

export async function getCmsPageDetail(id: string): Promise<CmsPageDetailData | null> {
  const page = await prisma.cmsPage.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sortOrder: "asc" }, include: { component: true } },
    },
  });
  if (!page) return null;
  const usedIds = page.sections.map((s) => s.componentId);
  const library = await prisma.cmsComponent.findMany({
    where: { id: { notIn: usedIds }, isGlobal: false },
    orderBy: { name: "asc" },
  });
  const schemaLabel = (key: string) => getCmsSchema(key)?.label ?? key;
  return {
    id: page.id,
    slug: page.slug,
    path: page.path,
    title: page.title,
    breadcrumb: page.breadcrumb,
    isActive: page.isActive,
    isProtected: page.isProtected,
    sections: page.sections.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      component: {
        id: s.component.id,
        key: s.component.key,
        name: s.component.name,
        schemaKey: s.component.schemaKey,
        schemaLabel: schemaLabel(s.component.schemaKey),
        type: s.component.type,
        isActive: s.component.isActive,
      },
    })),
    library: library.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      schemaKey: c.schemaKey,
      schemaLabel: schemaLabel(c.schemaKey),
      type: c.type,
    })),
  };
}

export type CmsComponentListRow = {
  id: string;
  key: string;
  name: string;
  schemaKey: string;
  schemaLabel: string;
  type: string;
  isGlobal: boolean;
  isActive: boolean;
  isProtected: boolean;
  usedOn: string[]; // page titles
  updatedAt: string;
};

export async function getCmsComponentsList(): Promise<CmsComponentListRow[]> {
  const rows = await prisma.cmsComponent.findMany({
    orderBy: { name: "asc" },
    include: { sections: { include: { page: { select: { title: true } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    schemaKey: c.schemaKey,
    schemaLabel: getCmsSchema(c.schemaKey)?.label ?? c.schemaKey,
    type: c.type,
    isGlobal: c.isGlobal,
    isActive: c.isActive,
    isProtected: c.isProtected,
    usedOn: c.isGlobal ? ["All pages"] : c.sections.map((s) => s.page.title),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export type CmsItemRow = { id: string; sortOrder: number; isActive: boolean; data: CmsData };

export type CmsComponentDetailData = {
  id: string;
  key: string;
  name: string;
  schemaKey: string;
  type: string;
  isGlobal: boolean;
  isActive: boolean;
  isProtected: boolean;
  content: CmsData;
  collections: Record<string, CmsItemRow[]>;
  usedOn: { id: string; title: string; path: string }[];
};

export async function getCmsComponentDetail(id: string): Promise<CmsComponentDetailData | null> {
  const c = await prisma.cmsComponent.findUnique({
    where: { id },
    include: {
      contents: { where: { locale: CMS_DEFAULT_LOCALE } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { contents: { where: { locale: CMS_DEFAULT_LOCALE } } },
      },
      sections: { include: { page: { select: { id: true, title: true, path: true } } } },
    },
  });
  if (!c) return null;
  const collections: Record<string, CmsItemRow[]> = {};
  for (const item of c.items) {
    (collections[item.collection] ??= []).push({
      id: item.id,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      data: (item.contents[0]?.data as CmsData | undefined) ?? {},
    });
  }
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    schemaKey: c.schemaKey,
    type: c.type,
    isGlobal: c.isGlobal,
    isActive: c.isActive,
    isProtected: c.isProtected,
    content: (c.contents[0]?.data as CmsData | undefined) ?? {},
    collections,
    usedOn: c.sections.map((s) => s.page),
  };
}
