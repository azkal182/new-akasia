CREATE TYPE "TransactionLedger" AS ENUM ('FINANCE', 'FUEL');

ALTER TABLE "Transaction"
ADD COLUMN "ledger" "TransactionLedger" NOT NULL DEFAULT 'FINANCE';

UPDATE "Transaction"
SET "ledger" = 'FUEL'
WHERE "type" = 'FUEL_PURCHASE'
   OR ("type" = 'INCOME' AND "description" LIKE 'Dana BBM - %');

CREATE INDEX "Transaction_ledger_idx" ON "Transaction"("ledger");
