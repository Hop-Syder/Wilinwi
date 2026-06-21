-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "receipt_code" TEXT;

-- CreateTable
CREATE TABLE "public_receipts" (
    "code" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "boutique_nom" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "montant_verse" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_receipts_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_receipt_code_key" ON "sales"("receipt_code");
