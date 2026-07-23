import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  flattenItems,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

type ViaSegment = {
  airline: string | null;
  flightNumber: string | null;
  duration: string | null;
  departureCode: string | null;
  departureCity: string | null;
  departureAirport: string | null;
  departureDateTime: string | null;
  arrivalCode: string | null;
  arrivalCity: string | null;
  arrivalAirport: string | null;
  arrivalDateTime: string | null;
};

function parseViaIndonesianDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^([A-Za-z]{3})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s+(\d{2}):(\d{2})$/i
  );
  if (!match) {
    return null;
  }

  const [, , day, monthLabel, year, hour, minute] = match;
  const monthMap: Record<string, string> = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];
  if (!month) {
    return null;
  }

  return {
    date: `${year}-${month}-${day.padStart(2, "0")}`,
    time: `${hour}:${minute}`,
  };
}

function parseViaBookingDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/i);
  if (!match) {
    return null;
  }

  const [, monthLabel, day, year] = match;
  const monthMap: Record<string, string> = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];
  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function formatViaDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Hour ${minutes} Minutes`;
}

function parseViaDurationToMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d+)j\s+(\d+)m$/i);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function findViaItem(
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

function collectViaItems(
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

function mapViaPassengerType(value: string | null) {
  const normalized = value?.match(/^(Dewasa|Anak|Bayi)/i)?.[1]?.toLowerCase();

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

function mapViaPassengerTitle(value: string | null) {
  const match = value?.match(/\b(Mr|Mrs|Ms|Miss)\b/i)?.[1];
  return match ? `${match.replace(/\.$/, "")}.` : null;
}

function extractViaPassengers(items: PdfTextItem[]) {
  const rowAnchors = collectViaItems(items, {
    minX: 60,
    maxX: 135,
    minY: 430,
    maxY: 470,
    pattern: /^(Mr|Mrs|Ms|Miss)\b/i,
  }).sort((left, right) => right.y - left.y);

  const baggage = findViaItem(items, {
    minX: 350,
    maxX: 450,
    minY: 290,
    maxY: 305,
    pattern: /^(Dewasa|Anak|Bayi):/i,
  })?.text ?? null;

  const passengers: PassengerDto[] = [];

  for (const anchor of rowAnchors) {
    const rowMinY = anchor.y - 16;
    const rowMaxY = anchor.y + 4;

    const nameParts = collectViaItems(items, {
      minX: 58,
      maxX: 145,
      minY: rowMinY,
      maxY: rowMaxY,
    }).sort((left, right) => right.y - left.y);

    const firstNameLine = nameParts[0]?.text ?? null;
    const secondNameLine = nameParts[1]?.text ?? null;
    const ageLine = findViaItem(items, {
      minX: 58,
      maxX: 145,
      minY: rowMinY - 12,
      maxY: rowMinY,
      pattern: /^(Dewasa|Anak|Bayi)/i,
    })?.text ?? null;

    const ticketParts = collectViaItems(items, {
      minX: 390,
      maxX: 445,
      minY: rowMinY - 6,
      maxY: rowMaxY,
    }).sort((left, right) => right.y - left.y);

    const ticketNumber = normalizeWhitespace(
      ticketParts.map((item) => item.text).join("")
    ) || null;

    const name = normalizeWhitespace(
      [
        firstNameLine?.replace(/\b(Mr|Mrs|Ms|Miss)\b/i, "") ?? "",
        secondNameLine ?? "",
      ].join(" ")
    );

    if (!name) {
      continue;
    }

    passengers.push({
      title: mapViaPassengerTitle(firstNameLine),
      name,
      passengerType: mapViaPassengerType(ageLine),
      baggage,
      ticketNumber,
    });
  }

  const pnr = findViaItem(items, {
    minX: 260,
    maxX: 300,
    minY: 440,
    maxY: 455,
  })?.text ?? null;

  const ticketNumber =
    passengers.find((passenger) => passenger.ticketNumber)?.ticketNumber ?? null;

  return {
    passengers,
    pnr,
    ticketNumber,
  };
}

function buildViaSegment(
  items: PdfTextItem[],
  options: {
    airlineYMin: number;
    airlineYMax: number;
    routeTopYMin: number;
    routeTopYMax: number;
    routeBottomYMin: number;
    routeBottomYMax: number;
    dateYMin: number;
    dateYMax: number;
    durationYMin: number;
    durationYMax: number;
  }
): ViaSegment {
  return {
    airline:
      findViaItem(items, {
        minX: 70,
        maxX: 135,
        minY: options.airlineYMin,
        maxY: options.airlineYMax,
      })?.text ?? null,
    flightNumber:
      findViaItem(items, {
        minX: 70,
        maxX: 115,
        minY: options.airlineYMin - 14,
        maxY: options.airlineYMax - 8,
      })?.text ?? null,
    duration:
      findViaItem(items, {
        minX: 495,
        maxX: 530,
        minY: options.durationYMin,
        maxY: options.durationYMax,
      })?.text ?? null,
    departureCode:
      findViaItem(items, {
        minX: 145,
        maxX: 170,
        minY: options.routeTopYMin,
        maxY: options.routeTopYMax,
      })?.text ?? null,
    departureCity:
      findViaItem(items, {
        minX: 170,
        maxX: 220,
        minY: options.routeTopYMin,
        maxY: options.routeTopYMax,
      })?.text ?? null,
    departureAirport:
      findViaItem(items, {
        minX: 145,
        maxX: 235,
        minY: options.routeBottomYMin,
        maxY: options.routeBottomYMax,
      })?.text ?? null,
    departureDateTime:
      findViaItem(items, {
        minX: 145,
        maxX: 245,
        minY: options.dateYMin,
        maxY: options.dateYMax,
      })?.text ?? null,
    arrivalCode:
      findViaItem(items, {
        minX: 270,
        maxX: 295,
        minY: options.routeTopYMin,
        maxY: options.routeTopYMax,
      })?.text ?? null,
    arrivalCity:
      findViaItem(items, {
        minX: 295,
        maxX: 340,
        minY: options.routeTopYMin,
        maxY: options.routeTopYMax,
      })?.text ?? null,
    arrivalAirport:
      findViaItem(items, {
        minX: 270,
        maxX: 380,
        minY: options.routeBottomYMin,
        maxY: options.routeBottomYMax,
      })?.text ?? null,
    arrivalDateTime:
      findViaItem(items, {
        minX: 270,
        maxX: 370,
        minY: options.dateYMin,
        maxY: options.dateYMax,
      })?.text ?? null,
  };
}

function formatViaCity(city: string | null, code: string | null) {
  if (city && code) {
    return `${city} (${code})`;
  }

  return city ?? code ?? null;
}

export function mapVia(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const bookingId = findViaItem(items, {
    minX: 80,
    maxX: 170,
    minY: 748,
    maxY: 753,
  })?.text ?? null;
  const bookingDateText = findViaItem(items, {
    minX: 510,
    maxX: 570,
    minY: 748,
    maxY: 753,
  })?.text ?? null;

  const firstSegment = buildViaSegment(items, {
    airlineYMin: 633,
    airlineYMax: 638,
    routeTopYMin: 633,
    routeTopYMax: 638,
    routeBottomYMin: 617,
    routeBottomYMax: 622,
    dateYMin: 605,
    dateYMax: 610,
    durationYMin: 624,
    durationYMax: 629,
  });

  const secondSegment = buildViaSegment(items, {
    airlineYMin: 543,
    airlineYMax: 548,
    routeTopYMin: 543,
    routeTopYMax: 548,
    routeBottomYMin: 528,
    routeBottomYMax: 533,
    dateYMin: 516,
    dateYMax: 521,
    durationYMin: 534,
    durationYMax: 539,
  });

  const transitDuration = findViaItem(items, {
    minX: 305,
    maxX: 335,
    minY: 589,
    maxY: 594,
  })?.text ?? null;

  const passengerInfo = extractViaPassengers(items);
  const departureParsed = parseViaIndonesianDate(firstSegment.departureDateTime);
  const arrivalParsed = parseViaIndonesianDate(secondSegment.arrivalDateTime);

  const durationMinutes = [
    firstSegment.duration,
    transitDuration,
    secondSegment.duration,
  ].reduce((total, value) => total + (parseViaDurationToMinutes(value) ?? 0), 0);

  const cabinClass =
    findViaItem(items, {
      minX: 455,
      maxX: 510,
      minY: 696,
      maxY: 701,
      pattern: /^(Economy|Business|Premium Economy|First Class)$/i,
    })?.text ?? null;

  return {
    provider: "VIA",
    pnr: passengerInfo.pnr ?? bookingId,
    ticketNumber: passengerInfo.ticketNumber ?? bookingId,
    airline:
      [firstSegment.airline, secondSegment.airline].filter(Boolean).join(", ") || null,
    flightNumber:
      [firstSegment.flightNumber, secondSegment.flightNumber]
        .filter(Boolean)
        .join(", ") || null,
    cabinClass,
    departureCity: formatViaCity(
      firstSegment.departureCity,
      firstSegment.departureCode
    ),
    arrivalCity: formatViaCity(
      secondSegment.arrivalCity,
      secondSegment.arrivalCode
    ),
    departureAirport: firstSegment.departureAirport,
    arrivalAirport: secondSegment.arrivalAirport,
    departureTerminal: null,
    arrivalTerminal: null,
    departureDate: departureParsed?.date ?? parseViaBookingDate(bookingDateText),
    arrivalDate: arrivalParsed?.date ?? parseViaBookingDate(bookingDateText),
    departureTime: departureParsed?.time ?? null,
    arrivalTime: arrivalParsed?.time ?? null,
    duration: durationMinutes > 0 ? formatViaDuration(durationMinutes) : null,
    rawText,
    passengers: passengerInfo.passengers,
    quantity: Math.max(passengerInfo.passengers.length, 1),
    farePerPax: null,
    grandTotal: null,
  };
}
