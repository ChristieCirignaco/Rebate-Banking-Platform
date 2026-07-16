-- CreateTable
CREATE TABLE "money_requests" (
    "id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remarks" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_by_name" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "wallet_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "money_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "money_requests_txn_id_key" ON "money_requests"("txn_id");

-- CreateIndex
CREATE INDEX "money_requests_status_idx" ON "money_requests"("status");

-- CreateIndex
CREATE INDEX "money_requests_user_id_idx" ON "money_requests"("user_id");

-- CreateIndex
CREATE INDEX "money_requests_created_at_idx" ON "money_requests"("created_at");

-- AddForeignKey
ALTER TABLE "money_requests" ADD CONSTRAINT "money_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
