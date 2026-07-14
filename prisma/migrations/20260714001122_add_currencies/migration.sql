-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'fiat',
    "flag_url" TEXT,
    "rate" DECIMAL(38,18) NOT NULL DEFAULT 1,
    "auto_wallet" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_roles" (
    "id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fee_type" TEXT NOT NULL DEFAULT 'percent',
    "fee_value" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "min_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "max_amount" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "currency_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_type_idx" ON "currencies"("type");

-- CreateIndex
CREATE INDEX "currency_roles_currency_id_idx" ON "currency_roles"("currency_id");

-- CreateIndex
CREATE UNIQUE INDEX "currency_roles_currency_id_role_key" ON "currency_roles"("currency_id", "role");

-- AddForeignKey
ALTER TABLE "currency_roles" ADD CONSTRAINT "currency_roles_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
