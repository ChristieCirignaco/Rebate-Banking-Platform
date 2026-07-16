-- CreateTable
CREATE TABLE "withdrawal_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "withdraw_method_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "field_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "withdrawal_accounts_user_id_idx" ON "withdrawal_accounts"("user_id");

-- CreateIndex
CREATE INDEX "withdrawal_accounts_withdraw_method_id_idx" ON "withdrawal_accounts"("withdraw_method_id");

-- AddForeignKey
ALTER TABLE "withdrawal_accounts" ADD CONSTRAINT "withdrawal_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_accounts" ADD CONSTRAINT "withdrawal_accounts_withdraw_method_id_fkey" FOREIGN KEY ("withdraw_method_id") REFERENCES "withdraw_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

