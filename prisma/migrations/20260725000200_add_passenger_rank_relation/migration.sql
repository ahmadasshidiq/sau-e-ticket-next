-- AlterTable
ALTER TABLE "Passenger"
ADD COLUMN "rankId" TEXT;

-- CreateIndex
CREATE INDEX "Passenger_rankId_idx" ON "Passenger"("rankId");

-- AddForeignKey
ALTER TABLE "Passenger"
ADD CONSTRAINT "Passenger_rankId_fkey"
FOREIGN KEY ("rankId") REFERENCES "Rank"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
