"use server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { isSafeHref } from "@/lib/cms/validate";

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };
const NOT_AUTHORIZED = { ok: false, error: "Not authorized." } as const;

async function revalidateMarketingChrome() {
  const paths = (await prisma.cmsPage.findMany({ select: { path: true } })).map((p) => p.path);
  for (const path of new Set(paths)) revalidatePath(path);
  revalidatePath("/news/[id]", "page");
  revalidatePath("/admin/menus", "layout");
}

type CreateInput = { location: "header" | "footer"; pageId?: string; url?: string; label?: string; openInNew?: boolean };

export async function createMenuItem(input: CreateInput): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  if (input.location !== "header" && input.location !== "footer") return { ok: false, error: "Invalid location." };
  const label = input.label?.trim() || null;
  const hasPage = Boolean(input.pageId);
  const url = input.url?.trim() || "";
  if (hasPage === Boolean(url)) return { ok: false, error: "Choose a page OR enter a custom link." };

  if (hasPage) {
    const page = await prisma.cmsPage.findUnique({ where: { id: input.pageId! }, select: { id: true } });
    if (!page) return { ok: false, error: "Page not found." };
  } else {
    if (url.length > 2000 || !isSafeHref(url)) return { ok: false, error: "Enter a valid link or path." };
  }

  const max = await prisma.cmsMenuItem.aggregate({ where: { location: input.location }, _max: { sortOrder: true } });
  await prisma.cmsMenuItem.create({
    data: {
      location: input.location,
      label,
      pageId: hasPage ? input.pageId! : null,
      url: hasPage ? null : url,
      openInNew: Boolean(input.openInNew),
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  await revalidateMarketingChrome();
  return { ok: true };
}

export async function updateMenuItem(id: string, input: { label?: string; url?: string; openInNew?: boolean }): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsMenuItem.findUnique({ where: { id }, select: { pageId: true } });
  if (!item) return { ok: false, error: "Item not found." };
  const data: { label?: string | null; url?: string; openInNew?: boolean } = {};
  if (input.label !== undefined) data.label = input.label.trim() || null;
  if (input.openInNew !== undefined) data.openInNew = Boolean(input.openInNew);
  if (input.url !== undefined) {
    if (item.pageId) return { ok: false, error: "A page link's URL follows the page." };
    const url = input.url.trim();
    if (!url || url.length > 2000 || !isSafeHref(url)) return { ok: false, error: "Enter a valid link or path." };
    data.url = url;
  }
  await prisma.cmsMenuItem.update({ where: { id }, data });
  await revalidateMarketingChrome();
  return { ok: true };
}

export async function toggleMenuItemActive(id: string, value: boolean): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsMenuItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return { ok: false, error: "Item not found." };
  await prisma.cmsMenuItem.update({ where: { id }, data: { isActive: Boolean(value) } });
  await revalidateMarketingChrome();
  return { ok: true };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsMenuItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return { ok: false, error: "Item not found." };
  await prisma.cmsMenuItem.delete({ where: { id } });
  await revalidateMarketingChrome();
  return { ok: true };
}

export async function reorderMenu(location: "header" | "footer", orderedIds: string[]): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const current = await prisma.cmsMenuItem.findMany({ where: { location }, select: { id: true } });
  const set = new Set(current.map((c) => c.id));
  if (
    orderedIds.length !== set.size ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => set.has(id))
  ) {
    return { ok: false, error: "The menu changed in another tab — refresh and try again." };
  }
  await prisma.$transaction(orderedIds.map((id, i) => prisma.cmsMenuItem.update({ where: { id }, data: { sortOrder: i } })));
  await revalidateMarketingChrome();
  return { ok: true };
}
