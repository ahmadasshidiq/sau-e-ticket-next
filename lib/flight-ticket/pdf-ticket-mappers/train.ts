import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  computeDuration,
  flattenItems,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function findTrainItem(
  items: PdfTextItem[],
  options: {
    page?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    pattern?: RegExp;
  }
) {
  const {
    page = 1,
    minX = -Infinity,
    maxX = Infinity,
    minY = -Infinity,
    maxY = Infinity,
    pattern,
  } = options;

  return (
    items.find(
      (item) =>
        item.page === page &&
        item.x >= minX &&
        item.x <= maxX &&
        item.y >= minY &&
        item.y <= maxY &&
        (!pattern || pattern.test(item.text))
    ) ?? null
  );
}

function collectTrainItems(
  items: PdfTextItem[],
  options: {
    page?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    pattern?: RegExp;
  }
) {
  const {
    page = 1,
    minX = -Infinity,
    maxX = Infinity,
    minY = -Infinity,
    maxY = Infinity,
    pattern,
  } = options;

  return items.filter(
    (item) =>
      item.page === page &&
      item.x >= minX &&
      item.x <= maxX &&
      item.y >= minY &&
      item.y <= maxY &&
      (!pattern || pattern.test(item.text))
  );
}

function parseTrainDateTime(value: string | null) {
  if (!value) {
    return {
      date: null,
      time: null,
    };
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?$/
  );
  if (!match) {
    return {
      date: null,
      time: null,
    };
  }

  const [, year, month, day, hour, minute] = match;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function mapTrainPassengerType(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized === "dewasa") {
    return "Adult";
  }

  if (normalized === "anak") {
    return "Child";
  }

  if (normalized === "bayi") {
    return "Infant";
  }

  return null;
}

function formatTrainPassengerName(value: string) {
  return normalizeWhitespace(
    value
      .split(".")
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ")
  );
}

function extractTrainPassengers(items: PdfTextItem[], bookingCode: string | null) {
  const candidateRows = collectTrainItems(items, {
    minY: 600,
    maxY: 630,
  });

  const yValues = [...new Set(candidateRows.map((item) => item.y))].sort((a, b) => b - a);
  const passengers: PassengerDto[] = [];

  for (const rowY of yValues) {
    const rowItems = candidateRows
      .filter((item) => Math.abs(item.y - rowY) <= 1)
      .sort((left, right) => left.x - right.x);

    const nameItem =
      rowItems.find((item) => item.x >= 20 && item.x <= 120 && /^[A-Z.]+$/.test(item.text)) ??
      null;
    const passengerTypeItem =
      rowItems.find((item) => item.x >= 310 && item.x <= 350) ?? null;

    if (!nameItem) {
      continue;
    }

    passengers.push({
      title: null,
      name: formatTrainPassengerName(nameItem.text),
      passengerType: mapTrainPassengerType(passengerTypeItem?.text ?? null),
      baggage: null,
      ticketNumber: bookingCode,
    });
  }

  return passengers;
}

export function mapTrain(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const pnr =
    findTrainItem(items, {
      minX: 150,
      maxX: 200,
      minY: 742,
      maxY: 745,
      pattern: /^[A-Z0-9]{6,8}$/i,
    })?.text ?? null;

  const flightNumber =
    findTrainItem(items, {
      minX: 150,
      maxX: 230,
      minY: 731,
      maxY: 734,
    })?.text ?? null;

  const departureStation =
    findTrainItem(items, {
      minX: 150,
      maxX: 260,
      minY: 710,
      maxY: 712,
    })?.text ?? null;

  const arrivalStation =
    findTrainItem(items, {
      minX: 150,
      maxX: 260,
      minY: 688,
      maxY: 690,
    })?.text ?? null;

  const departureDateTime = parseTrainDateTime(
    findTrainItem(items, {
      minX: 150,
      maxX: 230,
      minY: 699,
      maxY: 701,
      pattern: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/,
    })?.text ?? null
  );
  const arrivalDateTime = parseTrainDateTime(
    findTrainItem(items, {
      minX: 150,
      maxX: 230,
      minY: 677,
      maxY: 680,
      pattern: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/,
    })?.text ?? null
  );

  const cabinClass =
    findTrainItem(items, {
      minX: 150,
      maxX: 230,
      minY: 667,
      maxY: 669,
    })?.text ?? null;

  const passengers = extractTrainPassengers(items, pnr);

  return {
    provider: "TRAIN",
    pnr,
    ticketNumber: pnr,
    airline: "KAI",
    flightNumber,
    cabinClass,
    departureCity: departureStation,
    arrivalCity: arrivalStation,
    departureAirport: departureStation,
    arrivalAirport: arrivalStation,
    departureTerminal: null,
    arrivalTerminal: null,
    departureDate: departureDateTime.date,
    arrivalDate: arrivalDateTime.date,
    departureTime: departureDateTime.time,
    arrivalTime: arrivalDateTime.time,
    duration: computeDuration(departureDateTime.time, arrivalDateTime.time),
    quantity: Math.max(passengers.length, 1),
    rawText,
    passengers,
  };
}
