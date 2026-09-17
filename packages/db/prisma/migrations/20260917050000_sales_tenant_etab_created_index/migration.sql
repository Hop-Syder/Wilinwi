-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_tenant_id_etablissement_id_created_at_idx" ON "sales"("tenant_id", "etablissement_id", "created_at");
