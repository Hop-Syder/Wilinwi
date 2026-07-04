-- CreateEnum
CREATE TYPE "EtablissementInfrastructure" AS ENUM ('RETAIL', 'FOOD', 'HEALTH', 'SERVICE', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'BATCHED', 'MANUFACTURED', 'SERVICE');

-- CreateEnum
CREATE TYPE "StockPolicy" AS ENUM ('STRICT', 'ALLOW_NEGATIVE', 'NO_STOCK', 'RECIPE_BASED');

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('UNIT', 'WEIGHT', 'VOLUME', 'PACKAGE', 'TIME');

-- AlterTable
ALTER TABLE "etablissements" ADD COLUMN     "devise" TEXT DEFAULT 'XOF',
ADD COLUMN     "infrastructure" "EtablissementInfrastructure" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "langue" TEXT DEFAULT 'fr',
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "base_unit" TEXT,
ADD COLUMN     "stock_policy" "StockPolicy" NOT NULL DEFAULT 'STRICT',
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "unit_kind" "UnitKind" NOT NULL DEFAULT 'UNIT';

-- CreateIndex
CREATE INDEX "etablissements_tenant_id_infrastructure_idx" ON "etablissements"("tenant_id", "infrastructure");

-- CreateIndex
CREATE INDEX "products_tenant_id_type_idx" ON "products"("tenant_id", "type");
