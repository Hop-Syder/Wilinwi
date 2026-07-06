-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vendable_pos" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "product_exclusions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_exclusions_tenant_id_idx" ON "product_exclusions"("tenant_id");

-- CreateIndex
CREATE INDEX "product_exclusions_etablissement_id_idx" ON "product_exclusions"("etablissement_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_exclusions_product_id_etablissement_id_key" ON "product_exclusions"("product_id", "etablissement_id");

-- AddForeignKey
ALTER TABLE "product_exclusions" ADD CONSTRAINT "product_exclusions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_exclusions" ADD CONSTRAINT "product_exclusions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_exclusions" ADD CONSTRAINT "product_exclusions_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
