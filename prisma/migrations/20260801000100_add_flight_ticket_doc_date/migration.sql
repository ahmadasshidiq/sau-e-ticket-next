ALTER TABLE "FlightTicket"
ADD COLUMN "docDate" TIMESTAMP(3);

UPDATE "FlightTicket"
SET "bookingReference" = REGEXP_REPLACE("bookingReference", '\s+', '', 'g')
WHERE "bookingReference" IS NOT NULL
  AND "bookingReference" ~ '\s';
