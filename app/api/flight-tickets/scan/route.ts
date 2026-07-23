import { NextResponse } from "next/server";
import { TemplateType, VesselType } from "@prisma/client";
import { assertApiSession } from "@/lib/auth";
import { mapFlightTicketPdfToDraft } from "@/lib/flight-ticket/pdf-ticket-mapper";
import { serializeFlightTicket } from "@/lib/flight-ticket/serializers";
import { uploadToMinio } from "@/lib/minio";
import { prisma } from "@/lib/prisma";

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
  const mapped = await mapFlightTicketPdfToDraft(provider, buffer, {
    provider,
    originalFileName: file.name,
    objectKey: uploaded.objectName,
  });

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
      pnr: mapped.pnr ?? null,
      ticketNumber: mapped.ticketNumber ?? null,
      airline: mapped.airline ?? null,
      flightNumber: mapped.flightNumber ?? null,
      cabinClass: mapped.cabinClass ?? null,
      departureCity: mapped.departureCity ?? null,
      arrivalCity: mapped.arrivalCity ?? null,
      departureAirport: mapped.departureAirport ?? null,
      arrivalAirport: mapped.arrivalAirport ?? null,
      departureTerminal: mapped.departureTerminal ?? null,
      departureGate: mapped.departureGate ?? null,
      departureDate: mapped.departureDate ? new Date(mapped.departureDate) : null,
      arrivalDate: mapped.arrivalDate ? new Date(mapped.arrivalDate) : null,
      departureTime: mapped.departureTime ?? null,
      arrivalTerminal: mapped.arrivalTerminal ?? null,
      arrivalTime: mapped.arrivalTime ?? null,
      duration: mapped.duration ?? null,
      currency: "IDR",
      quantity: mapped.quantity ?? 1,
      selectedFlightOptionKey: mapped.selectedFlightOptionKey ?? null,
      flightOptionsJson: mapped.flightOptions
        ? JSON.stringify(mapped.flightOptions)
        : null,
      originalFileName: file.name,
      objectKey: uploaded.objectName,
      rawText: mapped.rawText ?? null,
      passengers: {
        create: (mapped.passengers ?? []).map((passenger) => ({
          title: passenger.title ?? null,
          name: passenger.name,
          passengerType: passenger.passengerType ?? null,
          baggage: passenger.baggage ?? null,
          ticketNumber: passenger.ticketNumber ?? null,
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
