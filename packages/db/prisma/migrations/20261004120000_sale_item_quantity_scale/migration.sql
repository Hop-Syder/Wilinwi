-- Quantités décimales exactes (2026-10-04).
--
-- 1) Échelle figée par ligne de vente (§19.1) : 1000 pour un produit
--    WEIGHT/VOLUME (quantite = 250 → 0,25 kg), 1 sinon. Les lignes existantes
--    gardent l'échelle 1 (quantité conservée telle qu'enregistrée).
ALTER TABLE "sale_items"
  ADD COLUMN IF NOT EXISTS "quantity_scale" INTEGER NOT NULL DEFAULT 1;

-- 2) Colonnes de quantité passées en Float (schema.prisma, commit 2870f23) —
--    sans migration jusqu'ici. Sans effet si `prisma db push` les a déjà
--    converties (ALTER vers le même type).
ALTER TABLE "products"
  ALTER COLUMN "stock" TYPE DOUBLE PRECISION,
  ALTER COLUMN "seuil_alerte" TYPE DOUBLE PRECISION;
ALTER TABLE "product_variants" ALTER COLUMN "stock" TYPE DOUBLE PRECISION;
ALTER TABLE "recipe_items" ALTER COLUMN "quantite" TYPE DOUBLE PRECISION;
ALTER TABLE "stock_movements" ALTER COLUMN "quantite" TYPE DOUBLE PRECISION;
ALTER TABLE "inventory_items"
  ALTER COLUMN "quantite_theorique" TYPE DOUBLE PRECISION,
  ALTER COLUMN "quantite_reelle" TYPE DOUBLE PRECISION,
  ALTER COLUMN "ecart" TYPE DOUBLE PRECISION;
ALTER TABLE "sale_items"
  ALTER COLUMN "quantite" TYPE DOUBLE PRECISION,
  ALTER COLUMN "quantite_retournee" TYPE DOUBLE PRECISION,
  ALTER COLUMN "unit_factor" TYPE DOUBLE PRECISION;
ALTER TABLE "purchase_order_items"
  ALTER COLUMN "quantite_commandee" TYPE DOUBLE PRECISION,
  ALTER COLUMN "quantite_recue" TYPE DOUBLE PRECISION;
ALTER TABLE "product_stock"
  ALTER COLUMN "quantite" TYPE DOUBLE PRECISION,
  ALTER COLUMN "quantite_min" TYPE DOUBLE PRECISION;
ALTER TABLE "dispatch_order_items" ALTER COLUMN "quantite" TYPE DOUBLE PRECISION;
