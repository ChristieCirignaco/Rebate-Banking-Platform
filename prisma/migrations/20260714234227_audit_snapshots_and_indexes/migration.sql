-- DropIndex
DROP INDEX "notifications_userId_idx";

-- AlterTable: activation_codes.updated_at is managed by Prisma (@updatedAt), not the DB
ALTER TABLE "activation_codes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable: reviewer name snapshots (survive the reviewing admin being renamed/deleted)
ALTER TABLE "deposits" ADD COLUMN     "reviewed_by_name" TEXT;
ALTER TABLE "kyc_submissions" ADD COLUMN     "reviewed_by_name" TEXT;
ALTER TABLE "products" ADD COLUMN     "reviewed_by_name" TEXT;
ALTER TABLE "withdraws" ADD COLUMN     "reviewed_by_name" TEXT;

-- Backfill the snapshots from the current reviewer's name.
UPDATE "deposits" d SET "reviewed_by_name" = u.name
  FROM "user" u WHERE u.id = d."reviewed_by_id";
UPDATE "withdraws" w SET "reviewed_by_name" = u.name
  FROM "user" u WHERE u.id = w."reviewed_by_id";
UPDATE "kyc_submissions" k SET "reviewed_by_name" = u.name
  FROM "user" u WHERE u.id = k."reviewed_by_id";
UPDATE "products" p SET "reviewed_by_name" = u.name
  FROM "user" u WHERE u.id = p."reviewed_by";

-- CreateIndex
CREATE INDEX "activation_codes_createdBy_idx" ON "activation_codes"("createdBy");
CREATE INDEX "deposits_deposit_method_id_idx" ON "deposits"("deposit_method_id");
CREATE INDEX "kyc_submissions_template_id_idx" ON "kyc_submissions"("template_id");
CREATE INDEX "notifications_userId_type_createdAt_idx" ON "notifications"("userId", "type", "createdAt");
CREATE INDEX "tickets_category_id_idx" ON "tickets"("category_id");
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at");
CREATE INDEX "withdraws_withdraw_method_id_idx" ON "withdraws"("withdraw_method_id");
