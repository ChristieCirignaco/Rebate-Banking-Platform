-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "emailed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notifications_scheduledAt_emailed_at_idx" ON "notifications"("scheduledAt", "emailed_at");
