import { NextResponse } from "next/server";
import { TemplateType, VesselType } from "@prisma/client";
import { assertApiSession } from "@/lib/auth";
import { mapFlightTicketOcrToDraft } from "@/lib/flight-ticket/ocr-mapper";
import { serializeFlightTicket } from "@/lib/flight-ticket/serializers";
import { uploadToMinio } from "@/lib/minio";
import { prisma } from "@/lib/prisma";

const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const FUNCTION_CATEGORY_VALUES = new Set(Object.values(VesselType));

export async function POST(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const provider = String(formData.get("provider") ?? "").trim();
  const functionCategory = String(formData.get("functionCategory") ?? "").trim();
  const assign = String(formData.get("assign") ?? "").trim();
  const serviceMode = String(formData.get("serviceMode") ?? "").trim();
  const file = formData.get("file");

  if (!provider) {
    return NextResponse.json(
      { message: "Provider is required." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Document file is required." },
      { status: 400 }
    );
  }

  if (!functionCategory) {
    return NextResponse.json(
      { message: "Function category is required." },
      { status: 400 }
    );
  }

  if (!assign) {
    return NextResponse.json(
      { message: "Assign is required." },
      { status: 400 }
    );
  }

  if (!serviceMode) {
    return NextResponse.json(
      { message: "Service mode is required." },
      { status: 400 }
    );
  }

  if (!FUNCTION_CATEGORY_VALUES.has(functionCategory as VesselType)) {
    return NextResponse.json(
      { message: "Invalid function category." },
      { status: 400 }
    );
  }

  const normalizedFunctionCategory = functionCategory as VesselType;

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadToMinio({
    folder: "flight-tickets/raw",
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    buffer,
  });

  const ocrPayload = new FormData();
  ocrPayload.append(
    "file",
    new Blob([buffer], { type: file.type || "application/octet-stream" }),
    file.name
  );

  let ocrResponse: Response;

  try {
    ocrResponse = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: "POST",
      body: ocrPayload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to connect to OCR service.",
      },
      { status: 502 }
    );
  }

  if (!ocrResponse.ok) {
    const message = await ocrResponse.text();
    return NextResponse.json(
      { message: message || "OCR service failed to process the file." },
      { status: 502 }
    );
  }

  const ocrResult = await ocrResponse.json();
  const template = await prisma.template.findFirst({
    where: {
      type: TemplateType.FLIGHT_TICKET,
      OR: [
        { name: { contains: provider, mode: "insensitive" } },
        { isDefault: true },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  const mapped = mapFlightTicketOcrToDraft(
    provider,
    ocrResult,
    file.name,
    uploaded.objectName
  );

  const latestTicket = await prisma.flightTicket.findFirst({
    where: {
      functionCategory: normalizedFunctionCategory,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      bookingReference: true,
    },
  });

  const nextBookingReferenceNumber = latestTicket?.bookingReference
    ? Number(latestTicket.bookingReference.replace(/[^\d]/g, "")) + 1
    : 1;
  const quantity = Math.max(mapped.passengers?.length ?? 0, 1);
  const normalizedGrandTotal = mapped.grandTotal
    ? Number(String(mapped.grandTotal).replace(/[^\d.-]/g, ""))
    : null;
  const farePerPax =
    normalizedGrandTotal && quantity
      ? String(Math.round(normalizedGrandTotal / quantity))
      : null;
  const bookingReferencePrefix =
    normalizedFunctionCategory === VesselType.CREWING_TANKER
      ? "CT"
      : normalizedFunctionCategory === VesselType.TAD
        ? "TD"
        : "CM";

  const created = await prisma.flightTicket.create({
    data: {
      functionCategory: normalizedFunctionCategory,
      assign,
      serviceMode,
      bookingReference: `${bookingReferencePrefix} ${String(nextBookingReferenceNumber).padStart(4, "0")}`,
      provider: mapped.provider,
      status: "DRAFT",
      templateId: template?.id ?? null,
      pnr: mapped.pnr,
      ticketNumber: mapped.ticketNumber,
      airline: mapped.airline,
      flightNumber: mapped.flightNumber,
      cabinClass: mapped.cabinClass,
      departureAirport: mapped.departureAirport,
      arrivalAirport: mapped.arrivalAirport,
      departureTerminal: mapped.departureTerminal,
      departureGate: mapped.departureGate,
      departureDate: mapped.departureDate ? new Date(mapped.departureDate) : null,
      arrivalDate: mapped.arrivalDate ? new Date(mapped.arrivalDate) : null,
      departureTime: mapped.departureTime,
      arrivalTerminal: mapped.arrivalTerminal,
      arrivalTime: mapped.arrivalTime,
      duration: mapped.duration,
      currency: mapped.currency,
      fare: mapped.fare ?? undefined,
      farePerPax: farePerPax ?? undefined,
      quantity,
      tax: mapped.tax ?? undefined,
      grandTotal: mapped.grandTotal ?? undefined,
      originalFileName: mapped.originalFileName,
      objectKey: mapped.objectKey,
      rawText: mapped.rawText,
      passengers: {
        create: (mapped.passengers ?? []).map((passenger) => ({
          title: passenger.title,
          name: passenger.name,
          passengerType: passenger.passengerType,
          baggage: passenger.baggage,
          ticketNumber: passenger.ticketNumber,
        })),
      },
    },
    include: {
      passengers: true,
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json(serializeFlightTicket(created), { status: 201 });
}
