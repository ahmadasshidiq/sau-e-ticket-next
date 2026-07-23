import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  computeDuration,
  flattenItems,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function findGarudaItem(
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

function collectGarudaItems(
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

function parseGarudaDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})([A-Za-z]{3})$/);
  if (!match) {
    return null;
  }

  const [, day, monthLabel] = match;
  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];
  if (!month) {
    return null;
  }

  return `2026-${month}-${day.padStart(2, "0")}`;
}

function mapGarudaTitle(rawTitle: string | null) {
  const normalized = rawTitle?.toUpperCase() ?? null;

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

function mapGarudaPassengerType(rawType: string | null) {
  const normalized = rawType?.toUpperCase() ?? null;

  if (normalized === "ADT") {
    return "Adult";
  }

  if (normalized === "CHD") {
    return "Child";
  }

  if (normalized === "INF") {
    return "Infant";
  }

  return null;
}

function parseGarudaPassengerName(value: string) {
  const text = normalizeWhitespace(value);
  const match = text.match(/^(.*?)\s+(MR|MRS|MS|MISS)\s+\((ADT|CHD|INF)\)$/i);
  if (!match) {
    return {
      title: null,
      name: text,
      passengerType: null,
    };
  }

  const [, rawName, rawTitle, rawType] = match;

  return {
    title: mapGarudaTitle(rawTitle),
    name: normalizeWhitespace(rawName),
    passengerType: mapGarudaPassengerType(rawType),
  };
}

function extractGarudaPassengers(items: PdfTextItem[], baggage: string | null) {
  const rowItems = collectGarudaItems(items, {
    minX: 20,
    maxX: 330,
    minY: 520,
    maxY: 545,
  }).sort((left, right) => {
    if (Math.abs(left.y - right.y) > 2) {
      return right.y - left.y;
    }
    return left.x - right.x;
  });

  const yValues = [...new Set(rowItems.map((item) => item.y))].sort((a, b) => b - a);
  const passengerRows = yValues.filter((y) =>
    rowItems.some((item) => item.y === y && item.x < 180 && /\((ADT|CHD|INF)\)$/i.test(item.text))
  );

  const passengers: PassengerDto[] = [];

  for (const rowY of passengerRows) {
    const nameItem =
      rowItems.find(
        (item) =>
          Math.abs(item.y - rowY) <= 1 &&
          item.x >= 20 &&
          item.x < 180 &&
          /\((ADT|CHD|INF)\)$/i.test(item.text)
      ) ?? null;
    const ticketItem =
      rowItems.find(
        (item) =>
          Math.abs(item.y - rowY) <= 1 &&
          item.x >= 220 &&
          item.x < 330 &&
          /^[A-Z0-9 ]{6,}$/.test(item.text)
      ) ?? null;

    if (!nameItem) {
      continue;
    }

    const parsedPassenger = parseGarudaPassengerName(nameItem.text);

    passengers.push({
      title: parsedPassenger.title,
      name: parsedPassenger.name,
      passengerType: parsedPassenger.passengerType,
      baggage,
      ticketNumber: ticketItem?.text.replace(/\s+/g, "") ?? null,
    });
  }

  return passengers;
}

function collectVerticalText(items: PdfTextItem[], xMin: number, xMax: number) {
  return normalizeWhitespace(
    items
      .filter((item) => item.x >= xMin && item.x <= xMax)
      .sort((left, right) => right.y - left.y)
      .map((item) => item.text)
      .join(" ")
  );
}

export function mapGaruda(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const pnr = findGarudaItem(items, {
    minX: 130,
    maxX: 180,
    minY: 640,
    maxY: 648,
    pattern: /^[A-Z0-9]{6}$/i,
  })?.text ?? null;

  const itineraryItems = collectGarudaItems(items, {
    minX: 20,
    maxX: 570,
    minY: 440,
    maxY: 475,
  });

  const departureCity = collectVerticalText(itineraryItems, 20, 80);
  const arrivalCity = collectVerticalText(itineraryItems, 95, 155);
  const flightNumber =
    findGarudaItem(itineraryItems, {
      minX: 165,
      maxX: 205,
      minY: 470,
      maxY: 475,
    })?.text ?? null;
  const cabinClass =
    findGarudaItem(itineraryItems, {
      minX: 208,
      maxX: 225,
      minY: 470,
      maxY: 475,
    })?.text ?? null;
  const departureDateText =
    findGarudaItem(itineraryItems, {
      minX: 235,
      maxX: 260,
      minY: 470,
      maxY: 475,
      pattern: /^\d{1,2}[A-Za-z]{3}$/,
    })?.text ?? null;
  const departureTime =
    findGarudaItem(itineraryItems, {
      minX: 262,
      maxX: 290,
      minY: 470,
      maxY: 475,
      pattern: /^\d{2}:\d{2}$/,
    })?.text ?? null;
  const arrivalTime =
    findGarudaItem(itineraryItems, {
      minX: 300,
      maxX: 330,
      minY: 470,
      maxY: 475,
      pattern: /^\d{2}:\d{2}$/,
    })?.text ?? null;
  const baggageRaw =
    findGarudaItem(itineraryItems, {
      minX: 505,
      maxX: 535,
      minY: 470,
      maxY: 475,
    })?.text ?? null;

  const departureTerminal =
    findGarudaItem(items, {
      minX: 20,
      maxX: 90,
      minY: 440,
      maxY: 448,
      pattern: /^Terminal\b/i,
    })?.text ?? null;

  const airline =
    findGarudaItem(items, {
      minX: 170,
      maxX: 280,
      minY: 428,
      maxY: 435,
      pattern: /^GARUDA INDONESIA$/i,
    })?.text ?? "GARUDA INDONESIA";

  const baggage = baggageRaw
    ? normalizeWhitespace(
        baggageRaw.replace(/(\d+)\s*K$/i, "$1 KG Baggage").replace(/(\d+)K$/i, "$1 KG Baggage")
      )
    : null;

  const passengers = extractGarudaPassengers(items, baggage);
  const ticketNumber =
    passengers.find((passenger) => passenger.ticketNumber)?.ticketNumber ?? null;
  const parsedDate = parseGarudaDate(departureDateText);

  return {
    provider: "GARUDA",
    pnr,
    ticketNumber,
    airline,
    flightNumber,
    cabinClass,
    departureCity,
    arrivalCity,
    departureAirport: departureCity || null,
    arrivalAirport: arrivalCity || null,
    departureTerminal,
    arrivalTerminal: null,
    departureDate: parsedDate,
    arrivalDate: parsedDate,
    departureTime,
    arrivalTime,
    duration: computeDuration(departureTime, arrivalTime),
    rawText,
    passengers,
    quantity: Math.max(passengers.length, 1),
    farePerPax: null,
    grandTotal: null,
  };
}
