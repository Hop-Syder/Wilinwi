-- Métadonnées déclaratives Mobile Money pour les ventes et leurs mouvements de trésorerie.
ALTER TABLE "sales"
  ADD COLUMN "momo_operator" TEXT,
  ADD COLUMN "momo_reference" TEXT;

ALTER TABLE "cash_movements"
  ADD COLUMN "momo_operator" TEXT,
  ADD COLUMN "momo_reference" TEXT;
