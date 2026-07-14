-- CreateTable
CREATE TABLE "withdraw_methods" (
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
    "process_time_value" INTEGER,
    "process_time_unit" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_method_fields" (
    "id" TEXT NOT NULL,
    "withdraw_method_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'input',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "withdraw_method_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraws" (
    "id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "withdraw_method_id" TEXT,
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
    "held_transaction_id" TEXT,
    "refund_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_schedule_days" (
    "day" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_schedule_days_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "withdraw_methods_type_idx" ON "withdraw_methods"("type");

-- CreateIndex
CREATE INDEX "withdraw_methods_currency_id_idx" ON "withdraw_methods"("currency_id");

-- CreateIndex
CREATE INDEX "withdraw_methods_payment_gateway_id_idx" ON "withdraw_methods"("payment_gateway_id");

-- CreateIndex
CREATE INDEX "withdraw_method_fields_withdraw_method_id_idx" ON "withdraw_method_fields"("withdraw_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdraws_txn_id_key" ON "withdraws"("txn_id");

-- CreateIndex
CREATE INDEX "withdraws_status_idx" ON "withdraws"("status");

-- CreateIndex
CREATE INDEX "withdraws_type_status_idx" ON "withdraws"("type", "status");

-- CreateIndex
CREATE INDEX "withdraws_user_id_idx" ON "withdraws"("user_id");

-- CreateIndex
CREATE INDEX "withdraws_created_at_idx" ON "withdraws"("created_at");

-- AddForeignKey
ALTER TABLE "withdraw_methods" ADD CONSTRAINT "withdraw_methods_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_methods" ADD CONSTRAINT "withdraw_methods_payment_gateway_id_fkey" FOREIGN KEY ("payment_gateway_id") REFERENCES "payment_gateways"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_method_fields" ADD CONSTRAINT "withdraw_method_fields_withdraw_method_id_fkey" FOREIGN KEY ("withdraw_method_id") REFERENCES "withdraw_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraws" ADD CONSTRAINT "withdraws_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraws" ADD CONSTRAINT "withdraws_withdraw_method_id_fkey" FOREIGN KEY ("withdraw_method_id") REFERENCES "withdraw_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
