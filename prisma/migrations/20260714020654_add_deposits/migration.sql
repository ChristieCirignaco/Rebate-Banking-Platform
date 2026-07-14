-- CreateTable
CREATE TABLE "deposit_methods" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "method_code" TEXT,
    "logo" TEXT,
    "currency_id" TEXT NOT NULL,
    "payment_gateway_id" TEXT,
    "rate" DECIMAL(38,18) NOT NULL DEFAULT 1,
    "charge_type" TEXT NOT NULL DEFAULT 'percent',
    "charge_value" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "min_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "max_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_method_fields" (
    "id" TEXT NOT NULL,
    "deposit_method_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'input',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "manual_method_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deposit_method_id" TEXT,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "fee_minor" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "description" TEXT,
    "field_values" JSONB,
    "remarks" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "wallet_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deposit_methods_type_idx" ON "deposit_methods"("type");

-- CreateIndex
CREATE INDEX "deposit_methods_currency_id_idx" ON "deposit_methods"("currency_id");

-- CreateIndex
CREATE INDEX "deposit_methods_payment_gateway_id_idx" ON "deposit_methods"("payment_gateway_id");

-- CreateIndex
CREATE INDEX "manual_method_fields_deposit_method_id_idx" ON "manual_method_fields"("deposit_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_txn_id_key" ON "deposits"("txn_id");

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");

-- CreateIndex
CREATE INDEX "deposits_type_status_idx" ON "deposits"("type", "status");

-- CreateIndex
CREATE INDEX "deposits_user_id_idx" ON "deposits"("user_id");

-- CreateIndex
CREATE INDEX "deposits_created_at_idx" ON "deposits"("created_at");

-- AddForeignKey
ALTER TABLE "deposit_methods" ADD CONSTRAINT "deposit_methods_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_methods" ADD CONSTRAINT "deposit_methods_payment_gateway_id_fkey" FOREIGN KEY ("payment_gateway_id") REFERENCES "payment_gateways"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_method_fields" ADD CONSTRAINT "manual_method_fields_deposit_method_id_fkey" FOREIGN KEY ("deposit_method_id") REFERENCES "deposit_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_deposit_method_id_fkey" FOREIGN KEY ("deposit_method_id") REFERENCES "deposit_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
