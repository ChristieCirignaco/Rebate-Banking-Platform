-- At most one currency may be the default. Partial unique index (not expressible in the
-- Prisma schema DSL) so concurrent "set default" writes can't leave two defaults: the
-- second transaction hits a unique violation and rolls back instead of silently winning.
CREATE UNIQUE INDEX "currencies_single_default" ON "currencies" ("is_default") WHERE "is_default";