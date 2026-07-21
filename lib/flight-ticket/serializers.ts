import type { FlightTicket, Passenger } from "@prisma/client";

type FlightTicketWithPassengers = FlightTicket & {
  passengers: Passenger[];
  template?: {
    id: string;
    name: string;
  } | null;
};

export function serializeFlightTicket(ticket: FlightTicketWithPassengers) {
  return {
    id: ticket.id,
    functionCategory: ticket.functionCategory,
    assign: ticket.assign,
    serviceMode: ticket.serviceMode,
    bookingReference: ticket.bookingReference,
    provider: ticket.provider,
    status: ticket.status,
    templateId: ticket.templateId,
    templateName: ticket.template?.name ?? null,
    pnr: ticket.pnr,
    ticketNumber: ticket.ticketNumber,
    airline: ticket.airline,
    flightNumber: ticket.flightNumber,
    cabinClass: ticket.cabinClass,
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
    fare: ticket.fare?.toString() ?? null,
    farePerPax: ticket.farePerPax?.toString() ?? null,
    quantity: ticket.quantity ?? 1,
    tax: ticket.tax?.toString() ?? null,
    grandTotal: ticket.grandTotal?.toString() ?? null,
    originalFileName: ticket.originalFileName,
    objectKey: ticket.objectKey,
    rawText: ticket.rawText,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    passengers: ticket.passengers.map((passenger) => ({
      id: passenger.id,
      title: passenger.title,
      name: passenger.name,
      passengerType: passenger.passengerType,
      baggage: passenger.baggage,
      ticketNumber: passenger.ticketNumber,
      createdAt: passenger.createdAt.toISOString(),
    })),
  };
}
