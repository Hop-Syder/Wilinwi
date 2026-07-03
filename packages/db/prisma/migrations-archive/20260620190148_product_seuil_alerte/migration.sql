-- AlterTable
ALTER TABLE "products" ADD COLUMN     "seuil_alerte" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pin_code" TEXT;
