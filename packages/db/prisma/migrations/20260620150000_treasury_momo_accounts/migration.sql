-- AlterEnum: Add MTN_MOMO and MOOV_MONEY to CashAccount
-- PostgreSQL requires adding enum values one at a time
ALTER TYPE "CashAccount" ADD VALUE IF NOT EXISTS 'MTN_MOMO';
ALTER TYPE "CashAccount" ADD VALUE IF NOT EXISTS 'MOOV_MONEY';
