-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- AlterTable
ALTER TABLE "FlightTicket"
ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "refundAmount" DECIMAL(18,2),
ADD COLUMN "rescheduleFee" DECIMAL(18,2);
