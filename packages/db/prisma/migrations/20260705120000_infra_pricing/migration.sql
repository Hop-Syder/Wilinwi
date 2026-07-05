-- CreateTable
CREATE TABLE "infra_pricing" (
    "infrastructure" "EtablissementInfrastructure" NOT NULL,
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infra_pricing_pkey" PRIMARY KEY ("infrastructure")
);


-- Défauts Option C (TDR §18.1) : RETAIL/SERVICE inclus, verticales à +5 000 FCFA/mois
-- par établissement actif. Éditables ensuite depuis la console super-admin.
INSERT INTO "infra_pricing" ("infrastructure", "price_monthly", "updated_at") VALUES
  ('RETAIL', 0, now()),
  ('SERVICE', 0, now()),
  ('FOOD', 5000, now()),
  ('HEALTH', 5000, now()),
  ('WHOLESALE', 5000, now())
ON CONFLICT ("infrastructure") DO NOTHING;
