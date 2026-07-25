-- AlterTable
ALTER TABLE "FlightTicket"
ADD COLUMN "vesselId" TEXT;

-- CreateIndex
CREATE INDEX "FlightTicket_vesselId_idx" ON "FlightTicket"("vesselId");

-- AddForeignKey
ALTER TABLE "FlightTicket"
ADD CONSTRAINT "FlightTicket_vesselId_fkey"
FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
