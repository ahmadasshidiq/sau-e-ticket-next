import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { assertApiSession } from "@/lib/auth";
import { serializeFlightTicket } from "@/lib/flight-ticket/serializers";
import { removeFromMinio } from "@/lib/minio";
import { prisma } from "@/lib/prisma";

function parseDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).replace(/[^\d.-]/g, "");
  if (!normalized) {
    return null;
  }

  return new Prisma.Decimal(normalized);
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const ticket = await prisma.flightTicket.findUnique({
    where: { id },
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

  if (!ticket) {
    return NextResponse.json(
      { message: "Flight ticket not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(serializeFlightTicket(ticket));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await request.json();

  const updated = await prisma.flightTicket.update({
    where: { id },
    data: {
      functionCategory: body.functionCategory ?? null,
      assign: body.assign ?? null,
      serviceMode: body.serviceMode ?? null,
      bookingReference: body.bookingReference ?? null,
      provider: body.provider ?? null,
      status: body.status ?? "DRAFT",
      pnr: body.pnr ?? null,
      ticketNumber: body.ticketNumber ?? null,
      airline: body.airline ?? null,
      flightNumber: body.flightNumber ?? null,
      cabinClass: body.cabinClass ?? null,
      departureCity: body.departureCity ?? null,
      arrivalCity: body.arrivalCity ?? null,
      departureAirport: body.departureAirport ?? null,
      arrivalAirport: body.arrivalAirport ?? null,
      departureTerminal: body.departureTerminal ?? null,
      departureGate: body.departureGate ?? null,
      departureDate: body.departureDate ? new Date(body.departureDate) : null,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      departureTime: body.departureTime ?? null,
      arrivalTerminal: body.arrivalTerminal ?? null,
      arrivalTime: body.arrivalTime ?? null,
      duration: body.duration ?? null,
      currency: body.currency ?? "IDR",
      fare: parseDecimal(body.fare),
      farePerPax: parseDecimal(body.farePerPax),
      quantity: body.quantity ? Number(body.quantity) : 1,
      tax: parseDecimal(body.tax),
      grandTotal: parseDecimal(body.grandTotal),
      selectedFlightOptionKey: body.selectedFlightOptionKey ?? null,
      flightOptionsJson: Array.isArray(body.flightOptions)
        ? JSON.stringify(body.flightOptions)
        : null,
      rawText: body.rawText ?? null,
      passengers: {
        deleteMany: {},
        create: Array.isArray(body.passengers)
          ? body.passengers.map((passenger: Record<string, unknown>) => ({
              title: passenger.title ? String(passenger.title) : null,
              name: String(passenger.name ?? ""),
              passengerType: passenger.passengerType
                ? String(passenger.passengerType)
                : null,
              baggage: passenger.baggage ? String(passenger.baggage) : null,
              ticketNumber: passenger.ticketNumber
                ? String(passenger.ticketNumber)
                : null,
            }))
          : [],
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

  return NextResponse.json(serializeFlightTicket(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    const ticket = await prisma.flightTicket.findUnique({
      where: { id },
      select: {
        id: true,
        objectKey: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { message: "Flight ticket not found." },
        { status: 404 }
      );
    }

    await prisma.flightTicket.delete({
      where: { id },
    });

    if (ticket.objectKey) {
      try {
        await removeFromMinio(ticket.objectKey);
      } catch {
        // Keep the record deletion successful even if object cleanup fails.
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete flight ticket.",
      },
      { status: 400 }
    );
  }
}
