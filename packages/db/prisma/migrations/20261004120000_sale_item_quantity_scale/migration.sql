-- Quantités décimales à la vente (§19.1) : échelle figée par ligne de vente.
-- 1000 pour un produit WEIGHT/VOLUME (quantite = 250 → 0,25 kg), 1 sinon.
-- Les lignes existantes gardent l'échelle 1 (leur quantité entière est
-- conservée telle qu'enregistrée à l'époque).
ALTER TABLE "sale_items"
  ADD COLUMN "quantity_scale" INTEGER NOT NULL DEFAULT 1;
