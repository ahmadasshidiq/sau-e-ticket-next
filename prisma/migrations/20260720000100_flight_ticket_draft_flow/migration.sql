CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED');

ALTER TABLE "FlightTicket"
ADD COLUMN "provider" TEXT,
ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "templateId" TEXT,
ADD COLUMN "functionCategory" "VesselType",
ADD COLUMN "assign" TEXT,
ADD COLUMN "serviceMode" TEXT,
ADD COLUMN "bookingReference" TEXT,
ADD COLUMN "farePerPax" DECIMAL(18,2),
ADD COLUMN "quantity" INTEGER DEFAULT 1;

CREATE INDEX "FlightTicket_provider_idx" ON "FlightTicket"("provider");
CREATE INDEX "FlightTicket_status_idx" ON "FlightTicket"("status");
CREATE UNIQUE INDEX "FlightTicket_bookingReference_key" ON "FlightTicket"("bookingReference");

ALTER TABLE "FlightTicket"
ADD CONSTRAINT "FlightTicket_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "Template"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
