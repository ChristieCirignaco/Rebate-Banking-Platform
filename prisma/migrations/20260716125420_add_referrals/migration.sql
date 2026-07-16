-- AlterTable
ALTER TABLE "user" ADD COLUMN     "referral_code" TEXT;

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reward_transaction_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_by_name" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_earnings_referred_user_id_key" ON "referral_earnings"("referred_user_id");

-- CreateIndex
CREATE INDEX "referral_earnings_referrer_id_idx" ON "referral_earnings"("referrer_id");

-- CreateIndex
CREATE INDEX "referral_earnings_status_idx" ON "referral_earnings"("status");

-- CreateIndex
CREATE INDEX "referral_earnings_created_at_idx" ON "referral_earnings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_referral_code_key" ON "user"("referral_code");

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

