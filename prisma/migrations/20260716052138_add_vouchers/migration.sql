-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "fee_minor" BIGINT NOT NULL DEFAULT 0,
    "rate" DECIMAL(38,18) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "redeemed_by_id" TEXT,
    "redeemed_by_name" TEXT,
    "redeemed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "debit_transaction_id" TEXT,
    "credit_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_creator_id_idx" ON "vouchers"("creator_id");

-- CreateIndex
CREATE INDEX "vouchers_created_at_idx" ON "vouchers"("created_at");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_redeemed_by_id_fkey" FOREIGN KEY ("redeemed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
