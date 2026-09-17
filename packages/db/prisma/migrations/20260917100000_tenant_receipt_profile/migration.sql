-- CreateEnum
CREATE TYPE "ReceiptPaperFormat" AS ENUM ('MM80', 'MM58');

-- AlterTable
ALTER TABLE "tenants"
  ADD COLUMN "telephone" TEXT,
  ADD COLUMN "ifu" TEXT,
  ADD COLUMN "receipt_header" TEXT,
  ADD COLUMN "receipt_footer" TEXT,
  ADD COLUMN "receipt_paper_format" "ReceiptPaperFormat" NOT NULL DEFAULT 'MM80';
