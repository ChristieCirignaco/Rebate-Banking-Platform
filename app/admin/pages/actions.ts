"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { normalizeSlug, validatePageSlug } from "@/lib/cms/validate";

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const NOT_AUTHORIZED: { ok: false; error: string } = { ok: false, error: "Not authorized." };

function revalidateAdmin() {
  revalidatePath("/admin/pages", "layout");
}

function revalidateMarketing(paths: (string | null | undefined)[]) {
  for (const path of new Set(paths.filter((p): p is string => Boolean(p)))) {
    revalidatePath(path);
  }
}

export type CreateCmsPagePayload = {
  title: string;
  slug: string;
  breadcrumb: string;
  isActive: boolean;
};

export async function createCmsPage(
  payload: CreateCmsPagePayload,
): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;

  const title = payload.title.trim();
  if (!title) return { ok: false, error: "Enter a page title." };
  if (title.length > 120) return { ok: false, error: "Title is too long." };

  const slug = normalizeSlug(payload.slug || title);
  const slugError = validatePageSlug(slug);
  if (slugError) return { ok: false, error: slugError };

  const breadcrumb = payload.breadcrumb.trim().slice(0, 120);
  try {
    const page = await prisma.cmsPage.create({
      data: {
        title,
        slug,
        path: `/${slug}`,
        breadcrumb: breadcrumb || null,
        isActive: Boolean(payload.isActive),
        isProtected: false,
        sortOrder: 100,
      },
    });
    revalidateAdmin();
    revalidateMarketing([page.path]);
    return { ok: true, id: page.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A page with this slug already exists." };
    }
    return { ok: false, error: "Could not create the page. Please try again." };
  }
}

// Partial patch: only the fields the admin actually changed are sent, so a
// stale editor tab can't silently revert edits made elsewhere (e.g. flip a
// page back to inactive while fixing a typo).
export type UpdateCmsPagePayload = {
  title?: string;
  slug?: string;
  breadcrumb?: string;
  isActive?: boolean;
};

export async function updateCmsPageMeta(
  id: string,
  payload: UpdateCmsPagePayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;

  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) return { ok: false, error: "Page not found." };

  const data: Prisma.CmsPageUpdateInput = {};
  let path = page.path;

  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) return { ok: false, error: "Enter a page title." };
    if (title.length > 120) return { ok: false, error: "Title is too long." };
    data.title = title;
  }
  if (payload.breadcrumb !== undefined) {
    data.breadcrumb = payload.breadcrumb.trim().slice(0, 120) || null;
  }
  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }
  // Core pages have dedicated route files — their slug/path is fixed.
  if (payload.slug !== undefined && !page.isProtected) {
    const slug = normalizeSlug(payload.slug);
    if (slug !== page.slug) {
      const slugError = validatePageSlug(slug);
      if (slugError) return { ok: false, error: slugError };
      path = `/${slug}`;
      data.slug = slug;
      data.path = path;
    }
  }
  if (Object.keys(data).length === 0) return { ok: true };

  try {
    await prisma.cmsPage.update({ where: { id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A page with this slug already exists." };
    }
    return { ok: false, error: "Could not save the page. Please try again." };
  }
  revalidateAdmin();
  revalidateMarketing([page.path, path]);
  return { ok: true };
}

export async function toggleCmsPageActive(id: string, value: boolean): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) return { ok: false, error: "Page not found." };
  await prisma.cmsPage.update({ where: { id }, data: { isActive: Boolean(value) } });
  revalidateAdmin();
  revalidateMarketing([page.path]);
  return { ok: true };
}

export async function deleteCmsPage(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const page = await prisma.cmsPage.findUnique({ where: { id } });
  if (!page) return { ok: false, error: "Page not found." };
  if (page.isProtected) {
    return { ok: false, error: "This is a core page and can't be deleted. You can deactivate it instead." };
  }
  await prisma.cmsPage.delete({ where: { id } });
  revalidateAdmin();
  revalidateMarketing([page.path]);
  return { ok: true };
}

export async function addPageSection(
  pageId: string,
  componentId: string,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const [page, component] = await Promise.all([
    prisma.cmsPage.findUnique({ where: { id: pageId } }),
    prisma.cmsComponent.findUnique({ where: { id: componentId } }),
  ]);
  if (!page) return { ok: false, error: "Page not found." };
  if (!component) return { ok: false, error: "Component not found." };
  if (component.isGlobal) {
    return { ok: false, error: "Site chrome components render on every page automatically." };
  }
  const max = await prisma.cmsPageSection.aggregate({
    where: { pageId },
    _max: { sortOrder: true },
  });
  try {
    await prisma.cmsPageSection.create({
      data: { pageId, componentId, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This component is already on the page." };
    }
    return { ok: false, error: "Could not add the component. Please try again." };
  }
  revalidateAdmin();
  revalidateMarketing([page.path]);
  return { ok: true };
}

export async function removePageSection(sectionId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const section = await prisma.cmsPageSection.findUnique({
    where: { id: sectionId },
    include: { page: { select: { path: true } } },
  });
  if (!section) return { ok: false, error: "Section not found." };
  await prisma.cmsPageSection.delete({ where: { id: sectionId } });
  revalidateAdmin();
  revalidateMarketing([section.page.path]);
  return { ok: true };
}

export async function toggleSectionActive(
  sectionId: string,
  value: boolean,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const section = await prisma.cmsPageSection.findUnique({
    where: { id: sectionId },
    include: { page: { select: { path: true } } },
  });
  if (!section) return { ok: false, error: "Section not found." };
  await prisma.cmsPageSection.update({
    where: { id: sectionId },
    data: { isActive: Boolean(value) },
  });
  revalidateAdmin();
  revalidateMarketing([section.page.path]);
  return { ok: true };
}

export async function reorderPageSections(
  pageId: string,
  orderedSectionIds: string[],
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const page = await prisma.cmsPage.findUnique({
    where: { id: pageId },
    include: { sections: { select: { id: true } } },
  });
  if (!page) return { ok: false, error: "Page not found." };
  const current = new Set(page.sections.map((s) => s.id));
  if (
    orderedSectionIds.length !== current.size ||
    !orderedSectionIds.every((id) => current.has(id))
  ) {
    return { ok: false, error: "The page changed in another tab — refresh and try again." };
  }
  await prisma.$transaction(
    orderedSectionIds.map((id, index) =>
      prisma.cmsPageSection.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  revalidateAdmin();
  revalidateMarketing([page.path]);
  return { ok: true };
}
