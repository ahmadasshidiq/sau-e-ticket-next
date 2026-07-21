import type { PassengerDto } from "./passenger.dto";

export interface CreateFlightTicketDto {
  provider?: string | null;
  status?: "DRAFT" | "GENERATED";
  templateId?: string | null;
  pnr?: string | null;
  ticketNumber?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTerminal?: string | null;
  departureGate?: string | null;
  departureDate?: Date | string | null;
  arrivalDate?: Date | string | null;
  departureTime?: string | null;
  arrivalTerminal?: string | null;
  arrivalTime?: string | null;
  duration?: string | null;
  currency?: string | null;
  fare?: string | number | null;
  tax?: string | number | null;
  grandTotal?: string | number | null;
  originalFileName: string;
  objectKey: string;
  rawText?: string | null;
  passengers?: PassengerDto[];
}
