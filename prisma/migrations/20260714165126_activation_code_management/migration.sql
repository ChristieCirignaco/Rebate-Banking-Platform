-- AlterTable
ALTER TABLE "activation_codes"
    ADD COLUMN "type" TEXT NOT NULL DEFAULT 'admin_created',
    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "created_by_name" TEXT,
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DROP COLUMN "usedById",
    DROP COLUMN "usedAt";

-- Backfill a display name for existing rows so "Created By" isn't blank.
UPDATE "activation_codes" ac
SET "created_by_name" = u.name
FROM "user" u
WHERE u.id = ac."createdBy" AND ac."created_by_name" IS NULL;

-- CreateIndex
CREATE INDEX "activation_codes_status_idx" ON "activation_codes"("status");

-- CreateIndex
CREATE INDEX "activation_codes_type_idx" ON "activation_codes"("type");

-- CreateIndex
CREATE INDEX "activation_codes_createdAt_idx" ON "activation_codes"("createdAt");

-- AddForeignKey
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
