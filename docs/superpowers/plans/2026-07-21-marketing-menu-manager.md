# Marketing Menu Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A WordPress-style Menu Manager that lets admins build and arrange the marketing header menu and footer quick links from CmsPages or custom links.

**Architecture:** One new `CmsMenuItem` table (page-link or custom-link, per `location`). A `cache()`-memoized read layer resolves items to `{label, href, openInNew}` with seed fallback. The `(home)` layout resolves both menus and passes them to the header/footer renderers. A `/admin/menus` screen (dnd-kit) manages items; a per-page toggle creates page-links. Existing header/footer links are backfilled into the new model, then the `links` collections are retired.

**Tech Stack:** Next.js 16 App Router, Prisma (Neon Postgres), dnd-kit, shadcn/ui, react-hot-toast via `@/lib/toast`.

## Global Constraints

- **No unit-test framework exists.** Verify each task with `npx tsc --noEmit` (ignore the stale `.next/**/validator.ts` errors), `npx eslint <files>`, `NODE_ENV=production npm run build`, and DB/browser checks. Do NOT add a test runner.
- All server actions guard with `getAdminSession()` and return `ActionResult`.
- Flat menus only — no `parentId`, no nesting.
- Toasts via `@/lib/toast`. Reuse `isSafeHref` (do not duplicate the rule).
- After a Server Action, hard-navigate (`window.location.href`) rather than `router.push` (documented router-wedge).
- Run all commands from the worktree root; never `cd` to the main checkout.
- Preserve exact current labels: header `Home / Service / Product / About Us / Contact Us`; footer `About Us / Privacy policy / Contact Us / Support`. Page titles differ (e.g. page "About" vs label "About Us"), so page-links MUST carry label overrides to stay identical.

---

### Task 1: CmsMenuItem schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (add model after `CmsPage`; add back-relation on `CmsPage`)

**Interfaces:**
- Produces: table `cms_menu_items`; Prisma model `CmsMenuItem`; `CmsPage.menuItems`.

- [ ] **Step 1: Add the model.** In `prisma/schema.prisma`, add to `model CmsPage` (after `sections CmsPageSection[]`):

```prisma
  menuItems CmsMenuItem[]
```

Add after the `CmsPage` block:

```prisma
model CmsMenuItem {
  id        String   @id @default(uuid())
  location  String // "header" | "footer"
  label     String? // override; null → use the linked page's title
  pageId    String?  @map("page_id")
  page      CmsPage? @relation(fields: [pageId], references: [id], onDelete: Cascade)
  url       String? // custom-link href (used when pageId is null)
  openInNew Boolean  @default(false) @map("open_in_new")
  isActive  Boolean  @default(true) @map("is_active")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([location, sortOrder])
  @@map("cms_menu_items")
}
```

- [ ] **Step 2: Create + apply the migration.**

Run: `npm run db:migrate -- --name add_cms_menu_items`
Expected: "Your database is now in sync with your schema." and a new folder under `prisma/migrations/`.

- [ ] **Step 3: Verify the client typechecks.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head`
Expected: no output.

- [ ] **Step 4: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(cms): CmsMenuItem model + migration for the menu manager"
```

---

### Task 2: SEED_MENU + read layer (`getMenu`)

**Files:**
- Modify: `lib/cms/seed-data.ts` (add `SEED_MENU`)
- Create: `lib/home/menu.ts`

**Interfaces:**
- Produces: `SEED_MENU: { header: SeedMenuItem[]; footer: SeedMenuItem[] }`; `type MenuLink = { label; href; openInNew }`; `getMenu(location)`.
- Consumes: `SEED_PAGES_BY_SLUG` (existing), `prisma`, `cache` from React.

- [ ] **Step 1: Add SEED_MENU to `lib/cms/seed-data.ts`.** Above `SEED_COMPONENTS`, add:

```ts
// Canonical marketing menus for fresh installs. Each header/footer item is a page-link
// (by slug) with an explicit label so the rendered text matches the pre-menu-manager site
// exactly (page titles differ from the menu labels, e.g. page "About" → label "About Us").
export type SeedMenuItem = { pageSlug?: string; label?: string; url?: string; openInNew?: boolean };
export const SEED_MENU: { header: SeedMenuItem[]; footer: SeedMenuItem[] } = {
  header: [
    { pageSlug: "home", label: "Home" },
    { pageSlug: "service", label: "Service" },
    { pageSlug: "product", label: "Product" },
    { pageSlug: "about", label: "About Us" },
    { pageSlug: "contact", label: "Contact Us" },
  ],
  footer: [
    { pageSlug: "about", label: "About Us" },
    { pageSlug: "privacy-policy", label: "Privacy policy" },
    { pageSlug: "contact", label: "Contact Us" },
    { pageSlug: "help", label: "Support" },
  ],
};
```

- [ ] **Step 2: Create `lib/home/menu.ts`.**

```ts
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
```

- [ ] **Step 3: Confirm `SEED_PAGES_BY_SLUG` exposes `{title, path}`.**

Run: `grep -n "SEED_PAGES_BY_SLUG" lib/cms/seed-data.ts`
Expected: an export whose value pages carry `slug`, `path`, `title` (they do — used by `lib/home/cms.ts`). If the Map value type omits `title`/`path`, widen it.

- [ ] **Step 4: Typecheck.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head`
Expected: no output.

- [ ] **Step 5: Commit.**

```bash
git add lib/cms/seed-data.ts lib/home/menu.ts
git commit -m "feat(cms): SEED_MENU + getMenu read layer"
```

---

### Task 3: Render header/footer from the menu

**Files:**
- Modify: `components/home/site-header.tsx` (menu prop instead of `nav.collections.links`)
- Modify: `components/home/site-footer.tsx` (footerMenu prop instead of `data.collections.links`)
- Modify: `app/(home)/layout.tsx` (resolve both menus, pass down)

**Interfaces:**
- Consumes: `MenuLink`, `getMenu` (Task 2).

- [ ] **Step 1: site-header.tsx.** Add prop `menu: MenuLink[]` to the component signature (import the type from `@/lib/home/menu`). Replace:

```tsx
  const NAV = (nav?.collections.links ?? []).map((l) => ({
    label: cmsText(l.data, "label"),
    href: cmsText(l.data, "href", "/"),
  }));
```

with:

```tsx
  const NAV = menu; // { label, href, openInNew }[]
```

In both the desktop and mobile link maps, when `item.openInNew` render `target="_blank" rel="noreferrer"` on the `<Link>`. Keep `signInLabel`/`joinLabel` from `nav` content unchanged.

- [ ] **Step 2: site-footer.tsx.** Add prop `footerMenu: MenuLink[]`. Replace:

```tsx
  const quickLinks = (data?.collections.links ?? []).map((l) => ({
    label: cmsText(l.data, "label"),
    href: cmsText(l.data, "href", "/"),
  }));
```

with `const quickLinks = footerMenu;` and honour `openInNew` on each `<Link>`. Change the list key from `l.href` to the array index (hrefs may repeat, e.g. About in both places is fine but guard duplicate keys within footer).

- [ ] **Step 3: layout.tsx.** Import `getMenu`. In the `Promise.all` at lines ~77-79 add `getMenu("header")` and `getMenu("footer")`; destructure `headerMenu`, `footerMenu`. Pass `menu={headerMenu}` to `<SiteHeader>` and `footerMenu={footerMenu}` to `<SiteFooter>`.

- [ ] **Step 4: Typecheck + lint + build.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && npx eslint components/home/site-header.tsx components/home/site-footer.tsx "app/(home)/layout.tsx"`
Expected: no output.

- [ ] **Step 5: Render parity check (dev DB still has the old collections; menu table empty → seed fallback).**

Run: `NODE_ENV=production npm run build 2>&1 | grep -E "Compiled successfully|error|Failed"`
Expected: "Compiled successfully". The header/footer now render from `getMenu`, which falls back to `SEED_MENU` (identical labels/order) since the table is empty.

- [ ] **Step 6: Commit.**

```bash
git add components/home/site-header.tsx components/home/site-footer.tsx "app/(home)/layout.tsx"
git commit -m "feat(home): render header/footer from the menu read layer"
```

---

### Task 4: Backfill + retire the link collections

**Files:**
- Modify: `scripts/seed-cms.ts` (idempotent menu backfill)
- Modify: `lib/cms/schemas.ts` (remove `links` collection from `site-nav`, `site-footer`)
- Modify: `lib/cms/seed-data.ts` (remove `collections.links` from the two seed components)

**Interfaces:**
- Consumes: `SEED_MENU`, `prisma`.

- [ ] **Step 1: Backfill in `scripts/seed-cms.ts`.** After the page loop, add a menu seed that runs per location only when it has no items. Prefer the LIVE link collection (preserves prod admin edits); fall back to `SEED_MENU`:

```ts
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
```

Call both inside `main()` (after pages), import `SEED_MENU` / `SEED_PAGES_BY_SLUG`, and add their counts to the final log:

```ts
const headerItems = await seedMenuLocation("header", "site-nav");
const footerItems = await seedMenuLocation("footer", "site-footer");
```

- [ ] **Step 2: Run the seed against the dev DB.**

Run: `npm run db:seed:cms`
Expected: no error; the menu locations are populated. Verify:
`npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.cmsMenuItem.findMany({orderBy:[{location:'asc'},{sortOrder:'asc'}],select:{location:true,label:true,url:true,pageId:true}}).then(r=>{console.table(r);return p.\$disconnect()})"`
Expected: 5 header + 4 footer rows, labels matching the parity list, page-links carrying a `pageId`.

- [ ] **Step 3: Remove the `links` collection from `lib/cms/schemas.ts`** for both `site-nav` and `site-footer` (delete the `collections: [ { key: "links", ... } ]` block from each; keep their `fields`).

- [ ] **Step 4: Remove `collections: { links: [...] }` from the `site-nav` and `site-footer` entries in `lib/cms/seed-data.ts`.**

- [ ] **Step 5: Typecheck + lint + build.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && npx eslint lib/cms/schemas.ts lib/cms/seed-data.ts scripts/seed-cms.ts && NODE_ENV=production npm run build 2>&1 | grep -E "Compiled successfully|error|Failed"`
Expected: no lint output; "Compiled successfully". Header/footer now render from the seeded menu rows (DB path, not fallback).

- [ ] **Step 6: Commit.**

```bash
git add scripts/seed-cms.ts lib/cms/schemas.ts lib/cms/seed-data.ts
git commit -m "feat(cms): backfill menus from live links; retire the link collections"
```

---

### Task 5: Admin data + server actions

**Files:**
- Create: `lib/admin/menus.ts` (list items per location, joined page info)
- Create: `app/admin/menus/actions.ts`
- Modify: `lib/cms/validate.ts` (export `isSafeHref`)

**Interfaces:**
- Produces: `getMenuManagerData()`; actions `createMenuItem`, `updateMenuItem`, `deleteMenuItem`, `toggleMenuItemActive`, `reorderMenu`.
- Consumes: `getCmsPagesList` (existing), `isSafeHref`.

- [ ] **Step 1: Export `isSafeHref`** — in `lib/cms/validate.ts` change `function isSafeHref` to `export function isSafeHref`.

- [ ] **Step 2: `lib/admin/menus.ts`.**

```ts
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
```

- [ ] **Step 3: `app/admin/menus/actions.ts`.** Full CRUD + reorder. Every action guards, validates the page-XOR-url invariant, validates custom URLs with `isSafeHref`, and revalidates all marketing pages (global chrome). Include a shared `revalidateMarketingChrome()` that lists all `CmsPage.path` and calls `revalidatePath` on each plus `revalidatePath("/news/[id]", "page")` and `revalidatePath("/admin/menus", "layout")`.

```ts
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
  if (orderedIds.length !== set.size || !orderedIds.every((id) => set.has(id))) {
    return { ok: false, error: "The menu changed in another tab — refresh and try again." };
  }
  await prisma.$transaction(orderedIds.map((id, i) => prisma.cmsMenuItem.update({ where: { id }, data: { sortOrder: i } })));
  await revalidateMarketingChrome();
  return { ok: true };
}
```

- [ ] **Step 4: Typecheck + lint.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && npx eslint lib/admin/menus.ts "app/admin/menus/actions.ts" lib/cms/validate.ts`
Expected: no output.

- [ ] **Step 5: Commit.**

```bash
git add lib/admin/menus.ts "app/admin/menus/actions.ts" lib/cms/validate.ts
git commit -m "feat(admin): menu manager data layer + server actions"
```

---

### Task 6: Admin Menus UI

**Files:**
- Create: `app/admin/menus/page.tsx`
- Create: `app/admin/menus/loading.tsx` (reuse `components/admin/skeletons/admin-skeleton.tsx`)
- Create: `components/admin/menus/menus-view.tsx` (two dnd-kit panels)
- Create: `components/admin/menus/menu-item-dialog.tsx` (add/edit)
- Modify: `components/app-sidebar.tsx` (add "Menus" to the Pages group)

**Interfaces:**
- Consumes: `getMenuManagerData`, the Task 5 actions, `MenuItemRow`.

- [ ] **Step 1: Sidebar.** In `components/app-sidebar.tsx` Pages group, add after Page Components:

```tsx
      { title: "Menus", href: "/admin/menus", icon: ListTree },
```

Import `ListTree` from `lucide-react`.

- [ ] **Step 2: `app/admin/menus/page.tsx`.**

```tsx
import type { Metadata } from "next";
import { AdminSection } from "@/components/admin/admin-section";
import { MenusView } from "@/components/admin/menus/menus-view";
import { getMenuManagerData } from "@/lib/admin/menus";

export const metadata: Metadata = { title: "Menus" };

export default async function AdminMenusPage() {
  const data = await getMenuManagerData();
  return (
    <AdminSection title="Menus" description="Arrange the header menu and footer quick links. Add pages or custom links to each location.">
      <MenusView data={data} />
    </AdminSection>
  );
}
```

- [ ] **Step 3: `app/admin/menus/loading.tsx`.**

```tsx
import { AdminSectionSkeleton, TableSkeleton } from "@/components/admin/skeletons/admin-skeleton";
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <TableSkeleton rows={5} columns={3} action />
      <TableSkeleton rows={4} columns={3} action />
    </AdminSectionSkeleton>
  );
}
```

- [ ] **Step 4: `components/admin/menus/menus-view.tsx`.** Client component. Two `<MenuPanel location=…>` sections (Header, Footer), each:
  - dnd-kit `DndContext` + `SortableContext` (import from `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` — mirror `components/admin/pages/page-editor.tsx`'s usage).
  - Row: drag handle, label (page title or custom label) + a `Badge` "Page"/"Custom", a muted href preview, active `Switch`, edit + delete buttons.
  - Reorder on drag end → optimistic local reorder then `reorderMenu(location, ids)`; on failure toast + `window.location.reload()`.
  - "Add item" button → opens `<MenuItemDialog mode="create" location=…>`.
  - Every successful mutation → `window.location.reload()` (hard nav after Server Action; simplest correct refresh).

- [ ] **Step 5: `components/admin/menus/menu-item-dialog.tsx`.** shadcn `Dialog`. Create mode: a segmented choice Page | Custom.
  - **Page**: `Select` over `data.pages` (label = page title + path); optional label override; open-in-new switch.
  - **Custom**: label (required) + url (required) + open-in-new.
  - Edit mode: for a page-link, only label + open-in-new are editable (url is derived); for a custom-link, label + url + open-in-new.
  - Submit calls `createMenuItem` / `updateMenuItem`; on ok toast + reload; on error toast the message.

- [ ] **Step 6: Typecheck + lint + build.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && npx eslint app/admin/menus components/admin/menus components/app-sidebar.tsx && NODE_ENV=production npm run build 2>&1 | grep -E "Compiled successfully|/admin/menus|error|Failed"`
Expected: no lint output; "Compiled successfully"; `/admin/menus` appears in the route list.

- [ ] **Step 7: Commit.**

```bash
git add app/admin/menus components/admin/menus components/app-sidebar.tsx
git commit -m "feat(admin): Menus manager UI (drag-reorder, add page/custom link)"
```

---

### Task 7: Per-page "add to menu" toggle

**Files:**
- Modify: `components/admin/pages/create-page-dialog.tsx` (two checkboxes)
- Modify: `app/admin/pages/actions.ts` (`createCmsPage` accepts + applies menu flags)
- Modify: the page editor settings component + `app/admin/pages/actions.ts` (membership add/remove)

**Interfaces:**
- Consumes: the page id from `createCmsPage`; `prisma.cmsMenuItem`.

- [ ] **Step 1: Extend `CreateCmsPagePayload`** in `app/admin/pages/actions.ts` with `addToHeader?: boolean; addToFooter?: boolean`. After the page is created, for each flagged location append a page-link:

```ts
async function appendPageLink(location: "header" | "footer", pageId: string) {
  const max = await prisma.cmsMenuItem.aggregate({ where: { location }, _max: { sortOrder: true } });
  await prisma.cmsMenuItem.create({ data: { location, pageId, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
}
```

Call for `addToHeader`/`addToFooter` after `prisma.cmsPage.create`, then `revalidateMarketing([page.path])` already runs; also revalidate chrome paths (reuse the same all-paths flush).

- [ ] **Step 2: create-page-dialog.tsx** — add two `Checkbox`es ("Add to header menu", "Add to footer menu"), default off, pass their values in the `createCmsPage` payload.

- [ ] **Step 3: Page editor settings** — add "In header menu" / "In footer menu" toggles reflecting whether a page-link for this page exists in each location. Add two actions in `app/admin/pages/actions.ts`: `setPageInMenu(pageId, location, present)` that creates the page-link (appended) when `present` and none exists, or deletes the page's page-link(s) in that location when `!present`. Guard, then revalidate chrome. Wire the editor's toggles to it (reload on success).

- [ ] **Step 4: Typecheck + lint + build.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && npx eslint "app/admin/pages/actions.ts" components/admin/pages/create-page-dialog.tsx components/admin/pages/page-editor.tsx && NODE_ENV=production npm run build 2>&1 | grep -E "Compiled successfully|error|Failed"`
Expected: no lint output; "Compiled successfully".

- [ ] **Step 5: Commit.**

```bash
git add "app/admin/pages/actions.ts" components/admin/pages
git commit -m "feat(admin): add pages to header/footer menus from the page editor"
```

---

### Task 8: Verification & parity

- [ ] **Step 1: Full build + typecheck + lint sweep.**

Run: `npx tsc --noEmit 2>&1 | grep -v validator.ts | head && NODE_ENV=production npm run build 2>&1 | grep -E "Compiled successfully|89/|error|Failed"`
Expected: clean typecheck; "Compiled successfully"; page count ≥ prior + 1 (new `/admin/menus`).

- [ ] **Step 2: Render parity in a browser (dev server + Chrome).** Start `npm run dev -- --port 3141`; open `/` and confirm the header shows `Home · Service · Product · About Us · Contact Us` and the footer quick links show `About Us · Privacy policy · Contact Us · Support`, identical to before. Open `/admin/menus`, reorder a header item, reload `/`, confirm the new order renders.

- [ ] **Step 3: Deactivate-page parity.** In admin, deactivate a page that is a header page-link; confirm it disappears from the header and reappears when reactivated.

- [ ] **Step 4: Final commit (if any parity fixes were needed), then stop for review.**

---

## Self-Review

- **Spec coverage:** model (T1), read layer + seed (T2), renderers (T3), migration/retire collections (T4), actions (T5), admin UI (T6), per-page toggle (T7), verification (T8) — all covered.
- **Type consistency:** `MenuLink` (menu.ts) used by renderers; `MenuItemRow` (admin/menus.ts) used by the UI; action `location` union `"header"|"footer"` consistent across T5/T7.
- **Prod migration note for execution:** after deploy, run `prisma migrate deploy` then `npm run db:seed:cms` on prod — the backfill converts the live links, so the prod menus stay identical.
