-- Add minute-based estimated duration without forcing legacy rows to change.
ALTER TABLE "UsageRecord" ADD COLUMN "estimatedDurationMinutes" INTEGER;

-- Preserve old day-based estimates where they exist. Rows with NULL estimatedDays
-- remain NULL so existing production data is not overwritten with guessed values.
UPDATE "UsageRecord"
SET "estimatedDurationMinutes" = "estimatedDays" * 1440
WHERE "estimatedDays" IS NOT NULL
  AND "estimatedDurationMinutes" IS NULL;
