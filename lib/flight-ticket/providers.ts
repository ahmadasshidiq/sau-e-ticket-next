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
    value: "LION_AIR",
    label: "Lion Air",
    templateName: "Lion Air Flight Ticket",
  },
  {
    value: "PELITA_AIR",
    label: "Pelita Air",
    templateName: "Pelita Air Flight Ticket",
  },
  {
    value: "TRAIN",
    label: "Train",
    templateName: "Train Ticket",
  },
  {
    value: "CITILINK",
    label: "Citilink",
    templateName: "Citilink Flight Ticket",
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
