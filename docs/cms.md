# Marketing CMS

The marketing site (`app/(home)/…`) is 100% database-driven. Admins manage it at
**Admin → Pages** (`/admin/pages` Page Manager, `/admin/pages/components` Component
Manager) — copy, images, ordering, and page composition all change without code.

## Data model (PostgreSQL via Prisma)

```
CmsPage            one row per page (slug, path, title, breadcrumb, active, protected)
 └─ CmsPageSection ordered join → which components render on the page, in what order
     └─ CmsComponent  reusable section (unique key, schemaKey, static|dynamic,
        │             global flag for site chrome, protected flag)
        ├─ CmsComponentContent      per-locale JSON of the fixed fields ("en" today)
        └─ CmsComponentItem         repeatable rows, grouped into named collections
            └─ CmsComponentItemContent  per-locale JSON per row
```

- **Locale-ready:** every text value is keyed by locale. Only `en` is seeded/edited
  today; adding Spanish later means writing `es` rows + a language switcher — no
  schema migration.
- **Protected** rows are seeded core pages/components: they can be deactivated but
  not deleted. **Global** components (Site Navigation, Site Footer) render on every
  page and never appear in the page-composition library.

## Where things live

| Piece | Path |
|---|---|
| Field schemas per component type | `lib/cms/schemas.ts` |
| Canonical seed copy + runtime fallback | `lib/cms/seed-data.ts` |
| Validation (server actions) | `lib/cms/validate.ts` |
| Public read layer (cached, fallback-safe) | `lib/home/cms.ts` |
| Section renderers + registry | `components/home/sections/` |
| Admin data functions | `lib/admin/cms.ts` |
| Admin actions | `app/admin/pages/actions.ts`, `app/admin/pages/components/actions.ts` |
| Admin UI | `components/admin/pages/` |
| Seeder | `scripts/seed-cms.ts` (`npm run db:seed:cms`, `--force` wipes + reseeds) |

Renderer resolution for a section: page-specific variant (`"about:think-big"`)
→ component key (`"hero"`) → schema fallback (generic layout). Admin-created pages
render through `app/(home)/[slug]/page.tsx` using the schema fallbacks.

Reads are resilient: if a row is missing (or the DB is unreachable) the site serves
the seed copy, so marketing pages can never render blank.

## Caching

The `(home)` group is ISR (`revalidate = 300`). Every admin mutation additionally
calls `revalidatePath` for the exact marketing paths the edited component/page
appears on, so changes go live immediately.

## Adding a new component type

1. **Schema** — add an entry to `CMS_SCHEMAS` in `lib/cms/schemas.ts`: fixed
   `fields` (types: text, textarea, accent, richtext, image, video, url, number,
   icon, select, lines) and optional repeatable `collections`. Set
   `creatable: true` if admins may create instances from "Add New".
2. **Renderer** — add a React server component in `components/home/sections/` and
   register it in `registry.tsx` under `BY_SCHEMA` (and `BY_KEY`/`BY_PAGE` for
   page-specific variants). Use `cmsText`/`cmsNum`/`cmsLines` readers and
   `<AccentText>` for `[[accent]]` fields.
3. **(Optional) seed** — add a `SeedComponent` to `lib/cms/seed-data.ts` and run
   `npm run db:seed:cms` (additive; never touches existing rows).

The admin editor, validation, and item CRUD come for free from the schema — no
admin UI changes needed.

## SEO

Deliberately out of scope for now. Page titles feed `generateMetadata`; global
SEO stays in Admin → Settings. The `CmsPage` model can grow SEO columns later.
