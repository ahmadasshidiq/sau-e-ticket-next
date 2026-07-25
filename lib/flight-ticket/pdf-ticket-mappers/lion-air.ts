import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  computeDuration,
  flattenItems,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function findLionAirItem(
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

function collectLionAirItems(
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

function parseLionAirDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/i);
  if (!match) {
    return null;
  }

  const [, day, monthLabel, year] = match;
  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    mei: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    agu: "08",
    sep: "09",
    oct: "10",
    okt: "10",
    nov: "11",
    dec: "12",
    des: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseLionAirTime(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})\.(\d{2})$/);
  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseLionAirPassengerTitle(value: string | null) {
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

function extractLionAirPassengers(items: PdfTextItem[]) {
  const rowItems = collectLionAirItems(items, {
    minY: 530,
    maxY: 538,
  }).sort((left, right) => left.x - right.x);

  const nameParts = rowItems
    .filter((item) => item.x >= 54 && item.x <= 160)
    .map((item) => item.text);
  const ticketNumber =
    rowItems.find((item) => item.x >= 370 && item.x <= 445 && /^\d{10,16}$/.test(item.text))
      ?.text ?? null;

  const rawName = normalizeWhitespace(nameParts.join(" "));
  const titleMatch = rawName.match(/\b(MR|MRS|MS|MISS)\b/i);
  const title = parseLionAirPassengerTitle(titleMatch?.[1] ?? null);
  const name = normalizeWhitespace(
    rawName
      .replace(/\b(MR|MRS|MS|MISS)\b\.?/i, "")
      .replace(/\//g, " ")
  );

  if (!name) {
    return [];
  }

  const passenger: PassengerDto = {
    title,
    name,
    passengerType: "Adult",
    baggage: null,
    ticketNumber,
  };

  return [passenger];
}

export function mapLionAir(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const pnr =
    findLionAirItem(items, {
      minX: 160,
      maxX: 230,
      minY: 638,
      maxY: 642,
      pattern: /^[A-Z0-9]{6}$/i,
    })?.text ?? null;

  const airlineLine = normalizeWhitespace(
    collectLionAirItems(items, {
      minX: 160,
      maxX: 220,
      minY: 612,
      maxY: 614,
    })
      .map((item) => item.text)
      .join(" ")
  );

  const flightNumber = normalizeWhitespace(
    collectLionAirItems(items, {
      minX: 40,
      maxX: 75,
      minY: 472,
      maxY: 475,
    })
      .map((item) => item.text)
      .join(" ")
  );

  const departureCity = normalizeWhitespace(
    collectLionAirItems(items, {
      minX: 84,
      maxX: 152,
      minY: 472,
      maxY: 475,
    })
      .map((item) => item.text)
      .join(" ")
  );
  const arrivalCity = normalizeWhitespace(
    collectLionAirItems(items, {
      minX: 194,
      maxX: 262,
      minY: 472,
      maxY: 475,
    })
      .map((item) => item.text)
      .join(" ")
  );

  const departureDate = parseLionAirDate(
    normalizeWhitespace(
      collectLionAirItems(items, {
        minX: 84,
        maxX: 140,
        minY: 462,
        maxY: 465,
      })
        .map((item) => item.text)
        .join(" ")
    )
  );
  const arrivalDate = parseLionAirDate(
    normalizeWhitespace(
      collectLionAirItems(items, {
        minX: 194,
        maxX: 250,
        minY: 462,
        maxY: 465,
      })
        .map((item) => item.text)
        .join(" ")
    )
  );

  const departureTime = parseLionAirTime(
    findLionAirItem(items, {
      minX: 84,
      maxX: 110,
      minY: 452,
      maxY: 455,
      pattern: /^\d{1,2}\.\d{2}$/,
    })?.text ?? null
  );
  const arrivalTime = parseLionAirTime(
    findLionAirItem(items, {
      minX: 194,
      maxX: 220,
      minY: 452,
      maxY: 455,
      pattern: /^\d{1,2}\.\d{2}$/,
    })?.text ?? null
  );

  const departureTerminal = normalizeWhitespace(
    collectLionAirItems(items, {
      minX: 84,
      maxX: 130,
      minY: 442,
      maxY: 445,
    })
      .map((item) => item.text)
      .join(" ")
  ) || null;

  const cabinClass =
    findLionAirItem(items, {
      minX: 304,
      maxX: 312,
      minY: 472,
      maxY: 475,
      pattern: /^[A-Z]$/,
    })?.text ?? null;

  const baggage =
    findLionAirItem(items, {
      minX: 498,
      maxX: 525,
      minY: 472,
      maxY: 475,
      pattern: /^\d+\s*Kg$/i,
    })?.text ?? null;

  const passengers = extractLionAirPassengers(items).map((passenger) => ({
    ...passenger,
    baggage,
  }));

  const ticketNumber = passengers[0]?.ticketNumber ?? null;

  return {
    provider: "LION_AIR",
    pnr,
    ticketNumber,
    airline: airlineLine || "Lion Air",
    flightNumber,
    cabinClass,
    departureCity: departureCity || null,
    arrivalCity: arrivalCity || null,
    departureAirport: departureCity || null,
    arrivalAirport: arrivalCity || null,
    departureTerminal,
    arrivalTerminal: null,
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
