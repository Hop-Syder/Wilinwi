-- AlterTable
-- Gating/billing : ajout de max_products + activated_at sur plan_configs,
-- grandfathered_until sur tenants.

ALTER TABLE "plan_configs"
    ADD COLUMN "max_products" INTEGER NOT NULL DEFAULT -1,
    ADD COLUMN "activated_at" TIMESTAMP(3);

ALTER TABLE "tenants"
    ADD COLUMN "grandfathered_until" TIMESTAMP(3);
