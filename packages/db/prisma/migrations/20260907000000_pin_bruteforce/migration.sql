-- AlterTable
-- Anti-bruteforce PIN persistant : compteur d'échecs + échéance de verrou sur `users`.
ALTER TABLE "users"
    ADD COLUMN "pin_fail_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "pin_locked_until" TIMESTAMP(3);
