export const FLIGHT_TICKET_PROVIDERS = [
  {
    value: "TRAVELOKA",
    label: "Traveloka",
    templateName: "Traveloka Flight Ticket",
  },
  {
    value: "VIA",
    label: "Via",
    templateName: "Via Flight Ticket",
  },
  {
    value: "GARUDA",
    label: "Garuda",
    templateName: "Garuda Flight Ticket",
  },
  {
    value: "CUE_TRAVEL",
    label: "Cue Travel",
    templateName: "Cue Travel Flight Ticket",
  },
] as const;

export type FlightTicketProvider =
  (typeof FLIGHT_TICKET_PROVIDERS)[number]["value"];

export function getFlightTicketProviderMeta(provider: string | null | undefined) {
  return (
    FLIGHT_TICKET_PROVIDERS.find((item) => item.value === provider) ??
    FLIGHT_TICKET_PROVIDERS[0]
  );
}
