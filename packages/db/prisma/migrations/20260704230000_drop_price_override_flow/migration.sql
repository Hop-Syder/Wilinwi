-- AlterEnum
BEGIN;
CREATE TYPE "SaleStatus_new" AS ENUM ('COMPLETED', 'PENDING_PAYMENT', 'CANCELLED');
ALTER TABLE "public"."sales" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "status" TYPE "SaleStatus_new" USING ("status"::text::"SaleStatus_new");
ALTER TYPE "SaleStatus" RENAME TO "SaleStatus_old";
ALTER TYPE "SaleStatus_new" RENAME TO "SaleStatus";
DROP TYPE "public"."SaleStatus_old";
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';
COMMIT;

-- DropForeignKey
ALTER TABLE "price_overrides" DROP CONSTRAINT "price_overrides_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "price_overrides" DROP CONSTRAINT "price_overrides_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "price_overrides" DROP CONSTRAINT "price_overrides_sale_item_id_fkey";

-- DropForeignKey
ALTER TABLE "price_overrides" DROP CONSTRAINT "price_overrides_tenant_id_fkey";

-- DropTable
DROP TABLE "price_overrides";

-- DropEnum
DROP TYPE "PriceOverrideStatus";

