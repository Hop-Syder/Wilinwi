-- AlterTable
ALTER TABLE "pos_sessions" ADD COLUMN IF NOT EXISTS "total_decaissements" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "pos_session_id" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cash_movements_tenant_id_pos_session_id_idx" ON "cash_movements"("tenant_id", "pos_session_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_movements_pos_session_id_fkey'
  ) THEN
    ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_pos_session_id_fkey"
      FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
