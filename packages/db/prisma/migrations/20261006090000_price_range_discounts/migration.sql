-- Fourchette de prix à la caisse + suivi des remises (2026-10-06).
-- Idempotent : rejouable sans erreur (IF NOT EXISTS).

-- Prix minimum propre à un conditionnement (casier 6 000, minimum 5 900).
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "floor_price" INTEGER;

-- Prix de vente affiché au moment de la vente (référence de la remise).
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "prix_reference" INTEGER;

-- Nom du client figé sur la vente (client de passage ou fiche CRM).
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "client_nom" TEXT;
