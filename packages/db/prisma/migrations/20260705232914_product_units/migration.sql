-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "unit_factor" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unit_id" UUID,
ADD COLUMN     "unit_label" TEXT;

-- CreateTable
CREATE TABLE "product_units" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "factor_to_base" INTEGER NOT NULL,
    "sale_price" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_units_tenant_id_idx" ON "product_units"("tenant_id");

-- CreateIndex
CREATE INDEX "product_units_product_id_idx" ON "product_units"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_units_product_id_label_key" ON "product_units"("product_id", "label");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
