-- CreateEnum
CREATE TYPE "CashAccount" AS ENUM ('CAISSE', 'MOBILE_MONEY', 'BANQUE');

-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashMovementSource" AS ENUM ('SALE', 'EXPENSE', 'REPAYMENT', 'TRANSFER', 'ADJUSTMENT', 'OPENING');

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "compte" "CashAccount" NOT NULL,
    "montant" INTEGER NOT NULL,
    "source" "CashMovementSource" NOT NULL,
    "categorie" TEXT,
    "note" TEXT,
    "sale_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "compte" "CashAccount" NOT NULL DEFAULT 'CAISSE',
    "solde_theorique" INTEGER NOT NULL,
    "solde_reel" INTEGER NOT NULL,
    "ecart" INTEGER NOT NULL,
    "note" TEXT,
    "closed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_idx" ON "cash_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_compte_idx" ON "cash_movements"("tenant_id", "compte");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_created_at_idx" ON "cash_movements"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_closes_tenant_id_idx" ON "cash_closes"("tenant_id");

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closes" ADD CONSTRAINT "cash_closes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
