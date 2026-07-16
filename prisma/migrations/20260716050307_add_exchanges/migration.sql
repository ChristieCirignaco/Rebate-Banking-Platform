-- CreateTable
CREATE TABLE "exchanges" (
    "id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "from_amount_minor" BIGINT NOT NULL,
    "to_amount_minor" BIGINT NOT NULL,
    "rate" DECIMAL(38,18) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "debit_transaction_id" TEXT,
    "credit_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchanges_txn_id_key" ON "exchanges"("txn_id");

-- CreateIndex
CREATE INDEX "exchanges_user_id_idx" ON "exchanges"("user_id");

-- CreateIndex
CREATE INDEX "exchanges_created_at_idx" ON "exchanges"("created_at");

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
