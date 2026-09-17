-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "pos_session_id" UUID;

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "fond_initial" INTEGER NOT NULL DEFAULT 0,
    "total_especes" INTEGER NOT NULL DEFAULT 0,
    "total_momo" INTEGER NOT NULL DEFAULT 0,
    "total_banque" INTEGER NOT NULL DEFAULT 0,
    "total_credit" INTEGER NOT NULL DEFAULT 0,
    "total_ventes" INTEGER NOT NULL DEFAULT 0,
    "nombre_ventes" INTEGER NOT NULL DEFAULT 0,
    "solde_theorique" INTEGER NOT NULL DEFAULT 0,
    "solde_reel" INTEGER,
    "ecart" INTEGER,
    "note" TEXT,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_idx" ON "pos_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_etablissement_id_idx" ON "pos_sessions"("tenant_id", "etablissement_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_status_idx" ON "pos_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_tenant_id_pos_session_id_idx" ON "sales"("tenant_id", "pos_session_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_vendeur_id_idx" ON "sales"("tenant_id", "vendeur_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_product_id_created_at_idx" ON "stock_movements"("tenant_id", "product_id", "created_at");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
