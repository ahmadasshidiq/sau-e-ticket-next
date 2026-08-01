import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  normalizeWhitespace,
  findItem,
  flattenItems,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function parseCueDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, day, monthLabel, yearShort] = match;
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

  return `20${yearShort}-${month}-${day.padStart(2, "0")}`;
}

function parseCuePassenger(items: PdfTextItem[]): PassengerDto[] {
  const passengerLine =
    findItem(items, /^[A-Z/.\s'-]+(?:\s+|\/)(MR|MRS|MS|MISS)$/i) ??
    findCueItem(items, {
      minX: 10,
      maxX: 260,
      minY: 745,
      maxY: 760,
      pattern: /^[A-Z/.\s'-]+(?:\s+|\/)(MR|MRS|MS|MISS)$/i,
    });
  if (!passengerLine) {
    return [];
  }

  const rawName = normalizeWhitespace(passengerLine.text);
  const titleMatch = rawName.match(/\b(MR|MRS|MS|MISS)$/i);
  const rawTitle = titleMatch?.[1]?.toUpperCase() ?? null;
  const title =
    rawTitle === "MR"
      ? "Mr."
      : rawTitle === "MRS"
        ? "Mrs."
        : rawTitle === "MS"
          ? "Ms."
          : rawTitle === "MISS"
        ? "Ms."
        : null;
  const withoutTitle = rawTitle
    ? rawName.replace(new RegExp(`(?:\\s+|/)${rawTitle}$`, "i"), "")
    : rawName;
  const cueNameParts = withoutTitle
    .split("/")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  const name =
    cueNameParts.length >= 2
      ? normalizeWhitespace(
          `${cueNameParts.slice(1).join(" ")} ${cueNameParts[0]}`
        )
      : normalizeWhitespace(withoutTitle);

  return name
    ? [
        { title, name, passengerType: "Adult", baggage: null, ticketNumber: null },
      ]
    : [];
}

function findCueItem(
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
  const { page = 1, minX = -Infinity, maxX = Infinity, minY = -Infinity, maxY = Infinity, pattern } =
    options;

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

function extractCueTicketNumber(items: PdfTextItem[]) {
  const labeledItem =
    items.find((item) => /^E-?Ticket No\.?\s*/i.test(item.text)) ?? null;

  if (labeledItem) {
    const value = normalizeWhitespace(
      labeledItem.text.replace(/^E-?Ticket No\.?\s*/i, "")
    );

    if (value) {
      return value;
    }
  }

  const labelOnlyItem =
    items.find((item) => /^E-?Ticket No\.?$/i.test(item.text)) ?? null;

  if (!labelOnlyItem) {
    return null;
  }

  const valueBelowLabel =
    items.find(
      (item) =>
        item.page === labelOnlyItem.page &&
        item.x >= labelOnlyItem.x - 8 &&
        item.x <= labelOnlyItem.x + 220 &&
        item.y < labelOnlyItem.y &&
        item.y >= labelOnlyItem.y - 24 &&
        !/^Important Notices$/i.test(item.text)
    ) ?? null;

  return valueBelowLabel ? normalizeWhitespace(valueBelowLabel.text) : null;
}

export function mapCueTravel(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");
  const itineraryRowYMin = 696;
  const itineraryRowYMax = 701;
  const departureDateItem = findCueItem(items, {
    minX: 35,
    maxX: 90,
    minY: itineraryRowYMin,
    maxY: itineraryRowYMax,
    pattern: /^\d{1,2}-[A-Za-z]{3}-\d{2}$/,
  });
  const sectorItem = findCueItem(items, {
    minX: 120,
    maxX: 180,
    minY: itineraryRowYMin,
    maxY: itineraryRowYMax,
    pattern: /^[A-Z]{3}-[A-Z]{3}$/i,
  });
  const flightNumberItem = findCueItem(items, {
    minX: 185,
    maxX: 240,
    minY: itineraryRowYMin,
    maxY: itineraryRowYMax,
    pattern: /^[A-Z]{2}\s+\d{2,4}$/i,
  });
  const classItem = findCueItem(items, {
    minX: 455,
    maxX: 510,
    minY: itineraryRowYMin,
    maxY: itineraryRowYMax,
    pattern: /^(Economy|Business|Premium Economy|First Class)$/i,
  });
  const arrivalDateItem = findCueItem(items, {
    minX: 395,
    maxX: 455,
    minY: itineraryRowYMin,
    maxY: itineraryRowYMax,
    pattern: /^\d{1,2}-[A-Za-z]{3}-\d{2}$/,
  });

  const detailTimeRowYMin = 606;
  const detailTimeRowYMax = 611;
  const departureCodeItem = findCueItem(items, {
    minX: 25,
    maxX: 60,
    minY: detailTimeRowYMin,
    maxY: detailTimeRowYMax,
    pattern: /^[A-Z]{3}$/i,
  });
  const departureTimeItem = findCueItem(items, {
    minX: 60,
    maxX: 100,
    minY: detailTimeRowYMin,
    maxY: detailTimeRowYMax,
    pattern: /^\d{2}:\d{2}$/,
  });
  const durationItem = findCueItem(items, {
    minX: 120,
    maxX: 175,
    minY: 607,
    maxY: 612,
    pattern: /^\d+\s*Hrs?\s+\d+\s*Mins?$/i,
  });
  const arrivalCodeItem = findCueItem(items, {
    minX: 195,
    maxX: 225,
    minY: detailTimeRowYMin,
    maxY: detailTimeRowYMax,
    pattern: /^[A-Z]{3}$/i,
  });
  const arrivalTimeItem = findCueItem(items, {
    minX: 228,
    maxX: 270,
    minY: detailTimeRowYMin,
    maxY: detailTimeRowYMax,
    pattern: /^\d{2}:\d{2}$/,
  });

  const pnrItem = findCueItem(items, {
    minX: 440,
    maxX: 590,
    minY: 649,
    maxY: 654,
    pattern: /^Airline Reference\s:\s[A-Z0-9]{6}$/i,
  });
  const airlineItem = findCueItem(items, {
    minX: 360,
    maxX: 530,
    minY: 606,
    maxY: 612,
    pattern:
      /^(Garuda Indonesia|Citilink|Batik Air|Lion Air|Super Air Jet|AirAsia|Pelita Air|Pelita Air Service)\b/i,
  });

  const departureAirportItem = findCueItem(items, {
    minX: 15,
    maxX: 160,
    minY: 560,
    maxY: 565,
  });
  const departureAirportSuffixItem = findCueItem(items, {
    minX: 15,
    maxX: 60,
    minY: 548,
    maxY: 553,
    pattern: /^Airport$/i,
  });
  const arrivalAirportItem = findCueItem(items, {
    minX: 185,
    maxX: 320,
    minY: 560,
    maxY: 565,
  });
  const arrivalTerminalItem = findCueItem(items, {
    minX: 185,
    maxX: 280,
    minY: 548,
    maxY: 553,
    pattern: /^Airport\s+-\s+Terminal\s+\d+$/i,
  });
  const departureCityItem = findCueItem(items, {
    minX: 15,
    maxX: 120,
    minY: 538,
    maxY: 555,
    pattern: /^[A-Za-z .'-]+,\s*Indonesia$/i,
  });
  const arrivalCityItem = findCueItem(items, {
    minX: 185,
    maxX: 290,
    minY: 536,
    maxY: 552,
    pattern: /^[A-Za-z .'-]+,\s*Indonesia$/i,
  });

  const passengers = parseCuePassenger(items);
  const checkedBaggageItem = findCueItem(items, {
    minX: 435,
    maxX: 470,
    minY: 548,
    maxY: 552,
    pattern: /^\d+\s*kg$/i,
  });
  const ticketNumber = extractCueTicketNumber(items);
  const departureCode = departureCodeItem?.text ?? sectorItem?.text.split("-")[0] ?? null;
  const arrivalCode = arrivalCodeItem?.text ?? sectorItem?.text.split("-")[1] ?? null;
  const departureAirport = normalizeWhitespace(
    [departureAirportItem?.text, departureAirportSuffixItem?.text].filter(Boolean).join(" ")
  );
  const arrivalAirport = normalizeWhitespace(arrivalAirportItem?.text ?? "");
  const arrivalTerminal = arrivalTerminalItem?.text
    ? normalizeWhitespace(arrivalTerminalItem.text.replace(/^Airport\s+-\s+/i, ""))
    : null;

  if (passengers[0]) {
    passengers[0].baggage = checkedBaggageItem?.text ?? null;
    passengers[0].ticketNumber = ticketNumber;
  }

  return {
    provider: "CUE_TRAVEL",
    pnr: pnrItem?.text.match(/[A-Z0-9]{6}$/i)?.[0] ?? null,
    ticketNumber,
    airline:
      airlineItem?.text.match(
        /^(Garuda Indonesia|Citilink|Batik Air|Lion Air|Super Air Jet|AirAsia|Pelita Air|Pelita Air Service)\b/i
      )?.[1] ?? null,
    flightNumber: flightNumberItem?.text ?? null,
    cabinClass: classItem?.text ?? null,
    departureCity: departureCityItem?.text
      ? `${departureCityItem.text.replace(/,\s*Indonesia$/i, "")} (${departureCode ?? ""})`
      : departureCode,
    arrivalCity: arrivalCityItem?.text
      ? `${arrivalCityItem.text.replace(/,\s*Indonesia$/i, "")} (${arrivalCode ?? ""})`
      : arrivalCode,
    departureAirport: departureAirport || null,
    arrivalAirport: arrivalAirport || null,
    departureTerminal: null,
    arrivalTerminal,
    departureDate: parseCueDate(departureDateItem?.text ?? null),
    arrivalDate: parseCueDate(arrivalDateItem?.text ?? null),
    departureTime: departureTimeItem?.text ?? null,
    arrivalTime: arrivalTimeItem?.text ?? null,
    duration:
      durationItem?.text.replace(
        /^(\d+)\s*Hrs?\s+(\d+)\s*Mins?$/i,
        "$1 Hour $2 Minutes"
      ) ?? null,
    rawText,
    passengers,
    quantity: Math.max(passengers.length, 1),
    farePerPax: null,
    grandTotal: null,
  };
}
