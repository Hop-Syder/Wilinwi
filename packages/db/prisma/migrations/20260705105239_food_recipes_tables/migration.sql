-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "table_id" UUID;

-- CreateTable
CREATE TABLE "product_recipes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_product_id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_tables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_product_id_key" ON "product_recipes"("product_id");

-- CreateIndex
CREATE INDEX "product_recipes_tenant_id_idx" ON "product_recipes"("tenant_id");

-- CreateIndex
CREATE INDEX "recipe_items_tenant_id_idx" ON "recipe_items"("tenant_id");

-- CreateIndex
CREATE INDEX "recipe_items_recipe_id_idx" ON "recipe_items"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_items_recipe_id_ingredient_product_id_key" ON "recipe_items"("recipe_id", "ingredient_product_id");

-- CreateIndex
CREATE INDEX "food_tables_tenant_id_idx" ON "food_tables"("tenant_id");

-- CreateIndex
CREATE INDEX "food_tables_tenant_id_etablissement_id_idx" ON "food_tables"("tenant_id", "etablissement_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_tables_etablissement_id_nom_key" ON "food_tables"("etablissement_id", "nom");

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_product_id_fkey" FOREIGN KEY ("ingredient_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_tables" ADD CONSTRAINT "food_tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_tables" ADD CONSTRAINT "food_tables_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "food_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
