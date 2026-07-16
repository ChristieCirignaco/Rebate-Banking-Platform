-- AlterTable
ALTER TABLE "manual_method_fields" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "withdraw_method_fields" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

