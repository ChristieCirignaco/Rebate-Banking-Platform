"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getCmsSchema } from "@/lib/cms/schemas";
import { SEED_COMPONENTS_BY_KEY } from "@/lib/cms/seed-data";
import { CMS_DEFAULT_LOCALE } from "@/lib/cms/types";
import { normalizeSlug, validateCmsData } from "@/lib/cms/validate";

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const NOT_AUTHORIZED: { ok: false; error: string } = { ok: false, error: "Not authorized." };

function revalidateAdmin() {
  revalidatePath("/admin/pages", "layout");
}

// A component edit must refresh every marketing page it appears on; global
// chrome (header/footer) appears on all of them.
async function revalidateComponentPages(componentId: string) {
  const component = await prisma.cmsComponent.findUnique({
    where: { id: componentId },
    select: { isGlobal: true },
  });
  const paths = component?.isGlobal
    ? (await prisma.cmsPage.findMany({ select: { path: true } })).map((p) => p.path)
    : (
        await prisma.cmsPageSection.findMany({
          where: { componentId },
          select: { page: { select: { path: true } } },
        })
      ).map((s) => s.page.path);
  for (const path of new Set(paths)) revalidatePath(path);
}

export type CreateCmsComponentPayload = { name: string; schemaKey: string };

export async function createCmsComponent(
  payload: CreateCmsComponentPayload,
): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;

  const name = payload.name.trim();
  if (!name) return { ok: false, error: "Enter a component name." };
  if (name.length > 120) return { ok: false, error: "Name is too long." };

  const schema = getCmsSchema(payload.schemaKey);
  if (!schema || !schema.creatable) return { ok: false, error: "Choose a valid component type." };

  // Seed keys are reserved even before seeding runs — otherwise an admin
  // component named "Hero"/"FAQ" would take a canonical key and a later
  // `db:seed:cms` would wire it into the core pages by connect-by-key.
  const keyTaken = async (candidate: string) =>
    SEED_COMPONENTS_BY_KEY.has(candidate) ||
    Boolean(await prisma.cmsComponent.findUnique({ where: { key: candidate } }));

  const base = normalizeSlug(name) || "component";
  let key = base;
  for (let i = 2; await keyTaken(key); i += 1) {
    key = `${base}-${i}`;
    if (i > 50) return { ok: false, error: "Could not generate a unique key for this name." };
  }

  try {
    const component = await prisma.cmsComponent.create({
      data: {
        key,
        name,
        schemaKey: schema.key,
        type: schema.key === "richtext" ? "dynamic" : "static",
        isGlobal: false,
        isProtected: false,
        contents: { create: { locale: CMS_DEFAULT_LOCALE, data: {} } },
      },
    });
    revalidateAdmin();
    return { ok: true, id: component.id };
  } catch {
    return { ok: false, error: "Could not create the component. Please try again." };
  }
}

export async function renameCmsComponent(id: string, name: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a component name." };
  if (trimmed.length > 120) return { ok: false, error: "Name is too long." };
  const component = await prisma.cmsComponent.findUnique({ where: { id } });
  if (!component) return { ok: false, error: "Component not found." };
  await prisma.cmsComponent.update({ where: { id }, data: { name: trimmed } });
  revalidateAdmin();
  return { ok: true };
}

export async function toggleCmsComponentActive(id: string, value: boolean): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const component = await prisma.cmsComponent.findUnique({ where: { id } });
  if (!component) return { ok: false, error: "Component not found." };
  if (component.isGlobal && !value) {
    return { ok: false, error: "Site chrome components can't be deactivated." };
  }
  await prisma.cmsComponent.update({ where: { id }, data: { isActive: Boolean(value) } });
  revalidateAdmin();
  await revalidateComponentPages(id);
  return { ok: true };
}

export async function deleteCmsComponent(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const component = await prisma.cmsComponent.findUnique({ where: { id } });
  if (!component) return { ok: false, error: "Component not found." };
  if (component.isProtected) {
    return { ok: false, error: "This is a core component and can't be deleted. You can deactivate it instead." };
  }
  await revalidateComponentPages(id);
  await prisma.cmsComponent.delete({ where: { id } });
  revalidateAdmin();
  return { ok: true };
}

export async function updateCmsComponentContent(
  id: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const component = await prisma.cmsComponent.findUnique({ where: { id } });
  if (!component) return { ok: false, error: "Component not found." };
  const schema = getCmsSchema(component.schemaKey);
  if (!schema) return { ok: false, error: "This component has no editable schema." };

  const result = validateCmsData(schema.fields, input);
  if (!result.ok) return result;

  await prisma.cmsComponentContent.upsert({
    where: { componentId_locale: { componentId: id, locale: CMS_DEFAULT_LOCALE } },
    create: {
      componentId: id,
      locale: CMS_DEFAULT_LOCALE,
      data: result.data as Prisma.InputJsonValue,
    },
    update: { data: result.data as Prisma.InputJsonValue },
  });
  revalidateAdmin();
  await revalidateComponentPages(id);
  return { ok: true };
}

function collectionDef(schemaKey: string, collection: string) {
  return getCmsSchema(schemaKey)?.collections?.find((c) => c.key === collection) ?? null;
}

export async function createCmsComponentItem(
  componentId: string,
  collection: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const component = await prisma.cmsComponent.findUnique({ where: { id: componentId } });
  if (!component) return { ok: false, error: "Component not found." };
  const def = collectionDef(component.schemaKey, collection);
  if (!def) return { ok: false, error: "This component has no such collection." };

  const result = validateCmsData(def.fields, input);
  if (!result.ok) return result;

  const max = await prisma.cmsComponentItem.aggregate({
    where: { componentId, collection },
    _max: { sortOrder: true },
  });
  await prisma.cmsComponentItem.create({
    data: {
      componentId,
      collection,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      contents: {
        create: { locale: CMS_DEFAULT_LOCALE, data: result.data as Prisma.InputJsonValue },
      },
    },
  });
  revalidateAdmin();
  await revalidateComponentPages(componentId);
  return { ok: true };
}

export async function updateCmsComponentItem(
  itemId: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsComponentItem.findUnique({
    where: { id: itemId },
    include: { component: true },
  });
  if (!item) return { ok: false, error: "Item not found." };
  const def = collectionDef(item.component.schemaKey, item.collection);
  if (!def) return { ok: false, error: "This component has no such collection." };

  const result = validateCmsData(def.fields, input);
  if (!result.ok) return result;

  await prisma.cmsComponentItemContent.upsert({
    where: { itemId_locale: { itemId, locale: CMS_DEFAULT_LOCALE } },
    create: { itemId, locale: CMS_DEFAULT_LOCALE, data: result.data as Prisma.InputJsonValue },
    update: { data: result.data as Prisma.InputJsonValue },
  });
  revalidateAdmin();
  await revalidateComponentPages(item.componentId);
  return { ok: true };
}

export async function deleteCmsComponentItem(itemId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsComponentItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false, error: "Item not found." };
  await prisma.cmsComponentItem.delete({ where: { id: itemId } });
  revalidateAdmin();
  await revalidateComponentPages(item.componentId);
  return { ok: true };
}

export async function moveCmsComponentItem(
  itemId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const item = await prisma.cmsComponentItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false, error: "Item not found." };

  const siblings = await prisma.cmsComponentItem.findMany({
    where: { componentId: item.componentId, collection: item.collection },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const index = siblings.findIndex((s) => s.id === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= siblings.length) return { ok: true };

  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((s, i) =>
      prisma.cmsComponentItem.update({ where: { id: s.id }, data: { sortOrder: i } }),
    ),
  );
  revalidateAdmin();
  await revalidateComponentPages(item.componentId);
  return { ok: true };
}
