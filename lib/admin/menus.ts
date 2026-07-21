import { prisma } from "@/lib/db";
import { getCmsPagesList, type CmsPageListRow } from "@/lib/admin/cms";

export type MenuItemRow = {
  id: string;
  location: "header" | "footer";
  label: string | null;
  url: string | null;
  openInNew: boolean;
  isActive: boolean;
  sortOrder: number;
  page: { id: string; title: string; path: string; isActive: boolean } | null;
};

export type MenuManagerData = {
  header: MenuItemRow[];
  footer: MenuItemRow[];
  pages: CmsPageListRow[]; // for the "add page" picker
};

export async function getMenuManagerData(): Promise<MenuManagerData> {
  const [items, pages] = await Promise.all([
    prisma.cmsMenuItem.findMany({
      orderBy: [{ location: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, location: true, label: true, url: true, openInNew: true, isActive: true, sortOrder: true,
        page: { select: { id: true, title: true, path: true, isActive: true } },
      },
    }),
    getCmsPagesList(),
  ]);
  const byLoc = (loc: string) => items.filter((i) => i.location === loc) as MenuItemRow[];
  return { header: byLoc("header"), footer: byLoc("footer"), pages };
}
