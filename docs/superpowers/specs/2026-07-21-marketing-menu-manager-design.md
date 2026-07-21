# Marketing Menu Manager — Design

**Date:** 2026-07-21
**Status:** Approved (brainstorming)

## Goal

Give admins a WordPress-style Menu Manager to build and arrange the marketing
site's **header menu** and **footer quick links**, assigning CmsPages or custom
links to each location — replacing the current hand-typed link collections
buried inside the Site Navigation / Site Footer components.

## Decisions (locked)

- **Flat menus only** — no nested dropdowns. Matches the current header pill-row
  and footer list.
- **Single source of truth** — menu editing moves entirely to the Menu Manager.
  The `links` collection is removed from the `site-nav` and `site-footer`
  component schemas. Their other fields (button labels, headings, contact) stay.
- Include **both** the full manager and the per-page "Add to Header / Footer"
  toggle; both feed the same model.

## Data model

New table `CmsMenuItem`:

```prisma
model CmsMenuItem {
  id        String   @id @default(uuid())
  location  String   // "header" | "footer"
  label     String?  @map("label")        // override; null → linked page's title
  pageId    String?  @map("page_id")
  page      CmsPage? @relation(fields: [pageId], references: [id], onDelete: Cascade)
  url       String?  @map("url")           // custom-link href (used when pageId is null)
  openInNew Boolean  @default(false) @map("open_in_new")
  isActive  Boolean  @default(true)  @map("is_active")
  sortOrder Int      @default(0)     @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  @@index([location, sortOrder])
  @@map("cms_menu_items")
}
```

`CmsPage` gains the back-relation `menuItems CmsMenuItem[]`.

**Invariant:** exactly one of `pageId` / `url` is set (enforced in the action,
not the DB).

- **Page-link** (`pageId` set): display label = `label?.trim() || page.title`;
  href = `page.path`. Hidden from the site when `page.isActive === false`.
  `onDelete: Cascade` removes the item if the page is deleted.
- **Custom-link** (`url` set): `label` required; `url` validated with the same
  safe-href rule as CMS link fields (internal `/…`, `#…`, `http(s)`, `mailto:`,
  `tel:` — never `javascript:`/`data:`).

## Read layer

`lib/home/menu.ts`:

```ts
export type MenuLink = { label: string; href: string; openInNew: boolean };
export const getMenu = cache(async (location: "header" | "footer"): Promise<MenuLink[]> => { ... });
```

- Loads active items for the location ordered by `sortOrder`, with
  `page { title, path, isActive }`.
- Resolves each: page-link → skip if `!page || !page.isActive`; else
  `{ label: item.label?.trim() || page.title, href: page.path, openInNew }`.
  custom-link → `{ label, href: url, openInNew }`.
- **Seed fallback** mirrors `lib/home/cms.ts`: on a transient DB error, throw so
  ISR keeps the last-good copy; when the table is legitimately empty, fall back
  to `SEED_MENU` so the nav never renders blank.

## Renderers

- `components/home/site-header.tsx` — replace the `nav.collections.links` map
  with a `menu: MenuLink[]` prop. Keep `signInLabel` / `joinLabel` from
  `site-nav` content. `openInNew` → `target="_blank" rel="noreferrer"`.
- `components/home/site-footer.tsx` — same, with a `footerMenu: MenuLink[]` prop.
- `app/(home)/layout.tsx` — resolve `getMenu("header")` / `getMenu("footer")`
  alongside the existing nav/footer component reads and pass down.

## Admin UI

Sidebar: add **Menus** → `/admin/menus` to the existing "Pages" group.

- `app/admin/menus/page.tsx` — loads both locations' items + `getCmsPagesList()`;
  renders `<MenusView>`.
- `components/admin/menus/menus-view.tsx` — two panels (Header, Footer). Each is
  a dnd-kit sortable list (same libs as the page editor). Per row: label / page
  title with a **Page** or **Custom** badge, active toggle, edit, delete.
  **Add item** dialog: choose *Page* (Select from the page list) or *Custom*
  (label + url + open-in-new).
- `app/admin/menus/actions.ts` — `createMenuItem`, `updateMenuItem`,
  `deleteMenuItem`, `toggleMenuItemActive`, `reorderMenu(location, orderedIds)`.
  Each: `getAdminSession()` guard, validate, then revalidate every marketing
  page (global chrome) via a shared helper that lists all `CmsPage.path` plus
  `revalidatePath("/news/[id]", "page")` — the same set
  `revalidateComponentPages` already flushes for global components.

## Per-page toggle

- `create-page-dialog.tsx` — "Add to header menu" / "Add to footer menu"
  checkboxes; on create, append a page-link item to each chosen location.
- Page editor settings — the same two toggles, reflecting current membership;
  toggling adds/removes the page-link item for that location.

## Migration (no breakage)

1. Prisma migration adds `cms_menu_items`.
2. A one-time backfill (in `scripts/seed-cms.ts`, guarded "only if the location
   has no items"): read the live `site-nav` / `site-footer` `links` collections
   and convert each to a `CmsMenuItem` — page-link when the href matches a
   `CmsPage.path`, else custom-link. This preserves any admin edits already made
   in prod. If those collections are also empty, fall back to `SEED_MENU`.
3. `SEED_MENU` (in `lib/cms/seed-data.ts`) is the canonical header/footer item
   list for fresh installs, expressed as page slugs + custom links.
4. Remove the `links` collection from the `site-nav` and `site-footer` schemas
   in `lib/cms/schemas.ts` and from their seed components. Existing collection
   rows in the DB become harmless vestigial data (no editor shows them, no
   renderer reads them).

## Validation & verification

- `isSafeHref` in `lib/cms/validate.ts` is currently module-private; export it
  (or a thin `isSafeMenuHref`) for the menu action to reuse — do not duplicate
  the rule.
- Verify the migrated header and footer render **identically** to today (same
  labels, order, links) before calling it done.
- `next build` (with `NODE_ENV=production`), `tsc --noEmit`, and `eslint` on all
  touched files must pass.

## Out of scope

Nested/dropdown submenus; multiple named menus per location; menus on non-home
marketing pages beyond the shared header/footer; SEO. No new public routes.
