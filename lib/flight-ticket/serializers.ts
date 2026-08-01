import type { FlightTicket, Passenger } from "@prisma/client";
import type { FlightOption } from "@/lib/flight-ticket/flight-options";

type FlightTicketWithPassengers = FlightTicket & {
  template?: {
    id: string;
    name: string;
  } | null;
  vessel?: {
    id: string;
    name: string;
    type: string;
  } | null;
  passengers: Array<
    Passenger & {
      rank?: {
        id: string;
        name: string;
      } | null;
    }
  >;
};

export function serializeFlightTicket(ticket: FlightTicketWithPassengers) {
  let flightOptions: FlightOption[] = [];

  try {
    flightOptions = ticket.flightOptionsJson
      ? (JSON.parse(ticket.flightOptionsJson) as FlightOption[])
      : [];
  } catch {
    flightOptions = [];
  }

  return {
    id: ticket.id,
    functionCategory: ticket.functionCategory,
    vesselId: ticket.vesselId,
    vesselName: ticket.vessel?.name ?? null,
    vesselType: ticket.vessel?.type ?? null,
    assign: ticket.assign,
    serviceMode: ticket.serviceMode,
    bookingReference: ticket.bookingReference,
    docDate: ticket.docDate?.toISOString() ?? null,
    provider: ticket.provider,
    status: ticket.status,
    templateId: ticket.templateId,
    templateName: ticket.template?.name ?? null,
    pnr: ticket.pnr,
    ticketNumber: ticket.ticketNumber,
    airline: ticket.airline,
    flightNumber: ticket.flightNumber,
    cabinClass: ticket.cabinClass,
    departureCity: ticket.departureCity,
    arrivalCity: ticket.arrivalCity,
    departureAirport: ticket.departureAirport,
    arrivalAirport: ticket.arrivalAirport,
    departureTerminal: ticket.departureTerminal,
    departureGate: ticket.departureGate,
    departureDate: ticket.departureDate?.toISOString() ?? null,
    arrivalDate: ticket.arrivalDate?.toISOString() ?? null,
    departureTime: ticket.departureTime,
    arrivalTerminal: ticket.arrivalTerminal,
    arrivalTime: ticket.arrivalTime,
    duration: ticket.duration,
    currency: ticket.currency,
    farePerPax: ticket.farePerPax?.toString() ?? null,
    ntaFare: ticket.ntaFare?.toString() ?? null,
    quantity: ticket.quantity ?? 1,
    tax: ticket.tax?.toString() ?? null,
    grandTotal: ticket.grandTotal?.toString() ?? null,
    selectedFlightOptionKey: ticket.selectedFlightOptionKey,
    flightOptions,
    originalFileName: ticket.originalFileName,
    objectKey: ticket.objectKey,
    rawText: ticket.rawText,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    passengers: ticket.passengers.map((passenger) => ({
      id: passenger.id,
      rankId: passenger.rank?.id ?? null,
      rankName: passenger.rank?.name ?? null,
      title: passenger.title,
      name: passenger.name,
      passengerType: passenger.passengerType,
      baggage: passenger.baggage,
      ticketNumber: passenger.ticketNumber,
      createdAt: passenger.createdAt.toISOString(),
    })),
  };
}
