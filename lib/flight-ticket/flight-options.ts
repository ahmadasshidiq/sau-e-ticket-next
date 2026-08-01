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

function parseDurationMinutes(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const text = value.trim();
  const clockMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clockMatch) {
    return Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
  }

  const hoursMatch = text.match(/(\d+)\s*(?:hours?|hrs?|jam|h)\b/i);
  const minutesMatch = text.match(/(\d+)\s*(?:minutes?|mins?|menit|m)\b/i);

  if (!hoursMatch && !minutesMatch) {
    return null;
  }

  return Number(hoursMatch?.[1] ?? 0) * 60 + Number(minutesMatch?.[1] ?? 0);
}

export function sumFlightOptionDurations(options: FlightOption[]) {
  const durations = options
    .map((option) => parseDurationMinutes(option.duration))
    .filter((duration): duration is number => duration !== null);

  if (!durations.length) {
    return null;
  }

  const totalMinutes = durations.reduce((total, duration) => total + duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = hours === 1 ? "Hour" : "Hours";
  const minuteLabel = minutes === 1 ? "Minute" : "Minutes";

  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}
