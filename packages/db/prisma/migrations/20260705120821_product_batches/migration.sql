-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "batch_id" UUID;

-- CreateTable
CREATE TABLE "product_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_batches_tenant_id_idx" ON "product_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "product_batches_tenant_id_product_id_expires_at_idx" ON "product_batches"("tenant_id", "product_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_etablissement_id_product_id_batch_number_key" ON "product_batches"("etablissement_id", "product_id", "batch_number");

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
