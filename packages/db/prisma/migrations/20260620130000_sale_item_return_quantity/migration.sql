-- Add return tracking for partial sale returns.
ALTER TABLE "sale_items"
ADD COLUMN IF NOT EXISTS "quantite_retournee" INTEGER NOT NULL DEFAULT 0;
