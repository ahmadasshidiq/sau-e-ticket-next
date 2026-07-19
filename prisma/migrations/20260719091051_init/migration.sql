-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('INVOICE', 'FLIGHT_TICKET');

-- CreateEnum
CREATE TYPE "VesselType" AS ENUM ('CREWING_TANKER', 'CMOS', 'TAD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "current_token" TEXT,
    "salt" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "favicon" TEXT,
    "applicationName" TEXT NOT NULL,
    "companyName" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "preview" TEXT,
    "html" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VesselType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vessel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "vendor" TEXT,
    "customer" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2),
    "tax" DECIMAL(18,2),
    "total" DECIMAL(18,2),
    "notes" TEXT,
    "originalFileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "currency" TEXT DEFAULT 'IDR',
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "vesselId" TEXT,
    "passenger" TEXT NOT NULL,
    "rankId" TEXT,
    "status" TEXT,
    "serviceArea" TEXT,
    "serviceMode" TEXT,
    "serviceProvider" TEXT,
    "serviceDetail" TEXT,
    "lineNumber" INTEGER,
    "fare" DECIMAL(18,2),

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightTicket" (
    "id" TEXT NOT NULL,
    "pnr" TEXT,
    "ticketNumber" TEXT,
    "airline" TEXT,
    "flightNumber" TEXT,
    "cabinClass" TEXT,
    "departureAirport" TEXT,
    "arrivalAirport" TEXT,
    "departureTerminal" TEXT,
    "departureGate" TEXT,
    "departureDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "departureTime" TEXT,
    "arrivalTerminal" TEXT,
    "arrivalTime" TEXT,
    "duration" TEXT,
    "currency" TEXT DEFAULT 'IDR',
    "fare" DECIMAL(18,2),
    "tax" DECIMAL(18,2),
    "grandTotal" DECIMAL(18,2),
    "originalFileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "flightTicketId" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT NOT NULL,
    "passengerType" TEXT,
    "baggage" TEXT,
    "ticketNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vessel_name_key" ON "Vessel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_name_key" ON "Rank"("name");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_customer_idx" ON "Invoice"("customer");

-- CreateIndex
CREATE INDEX "Invoice_vendor_idx" ON "Invoice"("vendor");

-- CreateIndex
CREATE INDEX "FlightTicket_pnr_idx" ON "FlightTicket"("pnr");

-- CreateIndex
CREATE INDEX "FlightTicket_departureDate_idx" ON "FlightTicket"("departureDate");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_flightTicketId_fkey" FOREIGN KEY ("flightTicketId") REFERENCES "FlightTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
