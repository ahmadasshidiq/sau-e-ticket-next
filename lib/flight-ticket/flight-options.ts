export type FlightOption = {
  key: string;
  label: string;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  departureCity?: string | null;
  arrivalCity?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTerminal?: string | null;
  arrivalTerminal?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  duration?: string | null;
};
