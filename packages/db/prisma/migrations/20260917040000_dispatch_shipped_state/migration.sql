-- AlterEnum
ALTER TYPE "DispatchStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

-- AlterTable
ALTER TABLE "dispatch_orders" ADD COLUMN IF NOT EXISTS "shipped_by" UUID,
ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP(3);
