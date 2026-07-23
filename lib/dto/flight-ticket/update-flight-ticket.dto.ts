import type { PassengerDto } from "./passenger.dto";
import type { FlightOption } from "@/lib/flight-ticket/flight-options";

export interface UpdateFlightTicketDto {
  provider?: string | null;
  status?: "DRAFT" | "GENERATED";
  templateId?: string | null;
  pnr?: string | null;
  ticketNumber?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  departureCity?: string | null;
  arrivalCity?: string | null;
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
  selectedFlightOptionKey?: string | null;
  flightOptions?: FlightOption[] | null;
  originalFileName?: string;
  objectKey?: string;
  rawText?: string | null;
  passengers?: PassengerDto[];
}
