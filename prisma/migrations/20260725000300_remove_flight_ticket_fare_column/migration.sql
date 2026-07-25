-- Backfill farePerPax from fare when needed
UPDATE "FlightTicket"
SET "farePerPax" = COALESCE("farePerPax", "fare")
WHERE "fare" IS NOT NULL;

-- AlterTable
ALTER TABLE "FlightTicket"
DROP COLUMN "fare";
