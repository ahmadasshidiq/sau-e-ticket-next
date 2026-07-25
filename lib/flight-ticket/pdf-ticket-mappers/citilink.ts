import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  computeDuration,
  flattenItems,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function findCitilinkItem(
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

function collectCitilinkItems(
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

function parseCitilinkDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^(?:Sen|Sel|Rab|Kam|Jum|Sab|Min)\s*-\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/i
  );
  if (!match) {
    return null;
  }

  const [, day, monthLabel, year] = match;
  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    mei: "05",
    may: "05",
    jun: "06",
    jul: "07",
    agu: "08",
    aug: "08",
    sep: "09",
    okt: "10",
    oct: "10",
    nov: "11",
    des: "12",
    dec: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseCitilinkTime(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})\.(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  } else if (meridiem === "PM" && hour < 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseCitilinkPassengerTitle(value: string | null) {
  const normalized = value?.toUpperCase() ?? "";

  if (normalized === "MR") {
    return "Mr.";
  }

  if (normalized === "MRS") {
    return "Mrs.";
  }

  if (normalized === "MS" || normalized === "MISS") {
    return "Ms.";
  }

  return null;
}

function parseCitilinkCityLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^([A-Z]{3})\s*-\s*(.+)$/);
  if (!match) {
    return normalizeWhitespace(value);
  }

  const [, code, city] = match;
  return `${normalizeWhitespace(city)} (${code})`;
}

function parseCitilinkTerminal(value: string | null) {
  if (!value) {
    return null;
  }

  const terminalMatch = value.match(/-\s*(Terminal.+)$/i);
  if (terminalMatch) {
    return normalizeWhitespace(terminalMatch[1]);
  }

  const zoneMatch = value.match(/-\s*(Domestic|International)$/i);
  return zoneMatch ? normalizeWhitespace(zoneMatch[1]) : null;
}

function extractCitilinkPassengers(
  items: PdfTextItem[],
  ticketNumber: string | null
) {
  const rowMarkers = collectCitilinkItems(items, {
    minX: 40,
    maxX: 55,
    minY: 440,
    maxY: 495,
    pattern: /^\d+$/,
  }).sort((left, right) => right.y - left.y);

  const passengers: PassengerDto[] = [];

  for (const marker of rowMarkers) {
    const rowItems = collectCitilinkItems(items, {
      minY: marker.y - 4,
      maxY: marker.y + 4,
    }).sort((left, right) => left.x - right.x);

    const nameItem =
      rowItems.find((item) => item.x >= 55 && item.x <= 180 && /^(MR|MRS|MS|MISS)\b/i.test(item.text)) ??
      null;
    const baggageItem =
      rowItems.find((item) => item.x >= 285 && item.x <= 325 && /^\d+\s*kg$/i.test(item.text)) ??
      null;

    if (!nameItem) {
      continue;
    }

    const titleMatch = nameItem.text.match(/^(MR|MRS|MS|MISS)\b/i);
    const title = parseCitilinkPassengerTitle(titleMatch?.[1] ?? null);
    const name = normalizeWhitespace(
      nameItem.text.replace(/^(MR|MRS|MS|MISS)\b\.?\s*/i, "")
    );

    if (!name) {
      continue;
    }

    passengers.push({
      title,
      name,
      passengerType: "Adult",
      baggage: baggageItem?.text ?? null,
      ticketNumber,
    });
  }

  return passengers;
}

export function mapCitilink(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const pnr =
    findCitilinkItem(items, {
      minX: 160,
      maxX: 250,
      minY: 670,
      maxY: 682,
      pattern: /^:\s*[A-Z0-9]{6}$/i,
    })?.text.replace(/^:\s*/, "") ?? null;

  const ticketNumber =
    findCitilinkItem(items, {
      minX: 160,
      maxX: 280,
      minY: 658,
      maxY: 670,
      pattern: /^:\s*[\d-]{8,}$/i,
    })?.text.replace(/^:\s*/, "") ?? null;

  const flightNumber =
    findCitilinkItem(items, {
      minX: 20,
      maxX: 90,
      minY: 584,
      maxY: 594,
      pattern: /^[A-Z0-9]{2}\s*\d{2,4}$/i,
    })?.text ?? null;

  const departureDateLabel =
    findCitilinkItem(items, {
      minX: 110,
      maxX: 240,
      minY: 596,
      maxY: 606,
      pattern: /^(?:Sen|Sel|Rab|Kam|Jum|Sab|Min)\s*-\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/i,
    })?.text ?? null;
  const arrivalDateLabel =
    findCitilinkItem(items, {
      minX: 350,
      maxX: 460,
      minY: 596,
      maxY: 606,
      pattern: /^(?:Sen|Sel|Rab|Kam|Jum|Sab|Min)\s*-\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/i,
    })?.text ?? null;

  const departureTimeLabel =
    findCitilinkItem(items, {
      minX: 120,
      maxX: 220,
      minY: 580,
      maxY: 590,
      pattern: /^\d{1,2}\.\d{2}\s*(AM|PM)$/i,
    })?.text ?? null;
  const arrivalTimeLabel =
    findCitilinkItem(items, {
      minX: 360,
      maxX: 450,
      minY: 580,
      maxY: 590,
      pattern: /^\d{1,2}\.\d{2}\s*(AM|PM)$/i,
    })?.text ?? null;

  const departureCityLabel =
    findCitilinkItem(items, {
      minX: 110,
      maxX: 240,
      minY: 566,
      maxY: 575,
      pattern: /^[A-Z]{3}\s*-\s*.+$/i,
    })?.text ?? null;
  const arrivalCityLabel =
    findCitilinkItem(items, {
      minX: 350,
      maxX: 460,
      minY: 566,
      maxY: 575,
      pattern: /^[A-Z]{3}\s*-\s*.+$/i,
    })?.text ?? null;

  const departureAirportLabel =
    findCitilinkItem(items, {
      minX: 110,
      maxX: 300,
      minY: 550,
      maxY: 563,
    })?.text ?? null;
  const arrivalAirportLabel =
    findCitilinkItem(items, {
      minX: 350,
      maxX: 540,
      minY: 550,
      maxY: 563,
    })?.text ?? null;

  const departureTime = parseCitilinkTime(departureTimeLabel);
  const arrivalTime = parseCitilinkTime(arrivalTimeLabel);
  const departureDate = parseCitilinkDate(departureDateLabel);
  const arrivalDate = parseCitilinkDate(arrivalDateLabel ?? departureDateLabel);
  const passengers = extractCitilinkPassengers(items, ticketNumber);

  return {
    provider: "CITILINK",
    pnr,
    ticketNumber,
    airline: "Citilink",
    flightNumber,
    cabinClass: "Economy",
    departureCity: parseCitilinkCityLabel(departureCityLabel),
    arrivalCity: parseCitilinkCityLabel(arrivalCityLabel),
    departureAirport: departureAirportLabel ?? null,
    arrivalAirport: arrivalAirportLabel ?? null,
    departureTerminal: parseCitilinkTerminal(departureAirportLabel),
    arrivalTerminal: parseCitilinkTerminal(arrivalAirportLabel),
    departureDate,
    arrivalDate,
    departureTime,
    arrivalTime,
    duration: computeDuration(departureTime, arrivalTime),
    quantity: Math.max(passengers.length, 1),
    rawText,
    passengers,
  };
}
