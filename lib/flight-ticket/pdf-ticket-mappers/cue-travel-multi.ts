import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import type { FlightOption } from "@/lib/flight-ticket/flight-options";
import {
  flattenItems,
  normalizeWhitespace,
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
    items.find((item) =>
      /^[A-Z/.\s'-]+(?:\s+|\/)(MR|MRS|MS|MISS)$/i.test(item.text)
    ) ?? null;

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
        : rawTitle === "MS" || rawTitle === "MISS"
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
    ? [{ title, name, passengerType: "Adult", baggage: null, ticketNumber: null }]
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

function collectCueItems(
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

  return null;
}

function parseCueDuration(value: string | null) {
  if (!value) {
    return null;
  }

  const compactMatch = value.match(/^(\d+)\s*Hrs?\s*(\d+)\s*Mins?$/i);
  if (compactMatch) {
    return `${compactMatch[1]} Hour ${compactMatch[2]} Minutes`;
  }

  const hoursOnlyMatch = value.match(/^(\d+)\s*Hrs?$/i);
  if (hoursOnlyMatch) {
    return `${hoursOnlyMatch[1]} Hour 0 Minutes`;
  }

  return value;
}

function cleanCueAirport(value: string | null) {
  if (!value) {
    return null;
  }

  return normalizeWhitespace(value.replace(/\s*-\s*$/, ""));
}

function cleanCueCity(value: string | null, code: string | null) {
  if (!value) {
    return code ?? null;
  }

  const city = normalizeWhitespace(value.replace(/,\s*[A-Za-z]+$/i, ""));
  return code ? `${city} (${code})` : city;
}

function findCueLocationBlock(
  items: PdfTextItem[],
  options: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    code: string | null;
  }
) {
  const locationItems = collectCueItems(items, {
    minX: options.minX,
    maxX: options.maxX,
    minY: options.minY,
    maxY: options.maxY,
  }).sort((left, right) => right.y - left.y);

  const cityItem =
    locationItems.find((item) => /,\s*.+$/u.test(item.text)) ?? null;

  const cityY = cityItem?.y ?? -Infinity;
  const terminalItem =
    locationItems.find(
      (item) =>
        item.y > cityY &&
        /(?:^Airport\s+-\s+Terminal\b|^Terminal\b)/i.test(item.text)
    ) ?? null;

  const airportItems = locationItems.filter(
    (item) =>
      item !== cityItem &&
      item !== terminalItem &&
      !/^(DEPARTING|ARRIVING|STATUS\b)/i.test(item.text) &&
      !/^[A-Z][a-z]+day\s+\d{1,2}-[A-Za-z]{3}-\d{4}$/i.test(item.text) &&
      !/^(Checked|Economy)$/i.test(item.text)
  );
  const airportItem =
    airportItems.find((item) => item.y > cityY) ??
    airportItems[0] ??
    null;

  return {
    city: cleanCueCity(cityItem?.text ?? null, options.code),
    airport: cleanCueAirport(airportItem?.text ?? null),
    terminal: terminalItem?.text
      ? normalizeWhitespace(
          terminalItem.text.replace(/^Airport\s+-\s+/i, "")
        )
      : null,
  };
}

function findCueAirportByPosition(
  items: PdfTextItem[],
  options: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }
) {
  const airportItem =
    collectCueItems(items, {
      minX: options.minX,
      maxX: options.maxX,
      minY: options.minY,
      maxY: options.maxY,
    })
      .filter(
        (item) =>
          !/^(DEPARTING|ARRIVING|STATUS\b|Checked|Economy)$/i.test(item.text) &&
          !/^Terminal\b/i.test(item.text) &&
          !/^Airport\s+-\s+Terminal\b/i.test(item.text) &&
          !/^[A-Z]{3}$/i.test(item.text) &&
          !/^\d{2}:\d{2}$/i.test(item.text) &&
          !/^\d+\s*Hrs?/i.test(item.text) &&
          !/^[A-Z][a-z]+day\s+\d{1,2}-[A-Za-z]{3}-\d{4}$/i.test(item.text) &&
          !/,\s*.+$/u.test(item.text)
      )
      .sort((left, right) => right.y - left.y)[0] ?? null;

  return cleanCueAirport(airportItem?.text ?? null);
}

function buildCueTravelOption(
  items: PdfTextItem[],
  rowY: number,
  detailY: number
): FlightOption | null {
  const sectorItem = findCueItem(items, {
    minX: 120,
    maxX: 180,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^[A-Z]{3}-[A-Z]{3}$/i,
  });
  const flightNumberItem = findCueItem(items, {
    minX: 185,
    maxX: 240,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^[A-Z]{2}\s+\d{2,4}$/i,
  });
  const timingItem = findCueItem(items, {
    minX: 295,
    maxX: 355,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/i,
  });
  const classItem = findCueItem(items, {
    minX: 455,
    maxX: 510,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^(Economy|Business|Premium Economy|First Class)$/i,
  });
  const departureDateItem = findCueItem(items, {
    minX: 35,
    maxX: 90,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^\d{1,2}-[A-Za-z]{3}-\d{2}$/,
  });
  const arrivalDateItem = findCueItem(items, {
    minX: 395,
    maxX: 455,
    minY: rowY - 1,
    maxY: rowY + 1,
    pattern: /^\d{1,2}-[A-Za-z]{3}-\d{2}$/,
  });

  const departureCodeItem = findCueItem(items, {
    minX: 25,
    maxX: 60,
    minY: detailY - 1,
    maxY: detailY + 3,
    pattern: /^[A-Z]{3}$/i,
  });
  const departureTimeItem = findCueItem(items, {
    minX: 60,
    maxX: 100,
    minY: detailY - 1,
    maxY: detailY + 3,
    pattern: /^\d{2}:\d{2}$/,
  });
  const durationItem = findCueItem(items, {
    minX: 120,
    maxX: 175,
    minY: detailY - 45,
    maxY: detailY - 36,
  });
  const arrivalCodeItem = findCueItem(items, {
    minX: 195,
    maxX: 225,
    minY: detailY - 1,
    maxY: detailY + 3,
    pattern: /^[A-Z]{3}$/i,
  });
  const arrivalTimeItem = findCueItem(items, {
    minX: 228,
    maxX: 270,
    minY: detailY - 1,
    maxY: detailY + 3,
    pattern: /^\d{2}:\d{2}$/,
  });
  const airlineItem = findCueItem(items, {
    minX: 360,
    maxX: 530,
    minY: detailY - 48,
    maxY: detailY - 38,
    pattern: /^.+\s+[A-Z]{2}\s+\d{2,4}$/i,
  });
  const departureCode = departureCodeItem?.text ?? sectorItem?.text.split("-")[0] ?? null;
  const arrivalCode = arrivalCodeItem?.text ?? sectorItem?.text.split("-")[1] ?? null;
  const departureLocation = findCueLocationBlock(items, {
    minX: 15,
    maxX: 170,
    minY: detailY - 115,
    maxY: detailY - 20,
    code: departureCode,
  });
  const arrivalLocation = findCueLocationBlock(items, {
    minX: 185,
    maxX: 330,
    minY: detailY - 115,
    maxY: detailY - 20,
    code: arrivalCode,
  });
  const departureAirport = findCueAirportByPosition(items, {
    minX: 15,
    maxX: 170,
    minY: detailY - 92,
    maxY: detailY - 72,
  });
  const arrivalAirport = findCueAirportByPosition(items, {
    minX: 185,
    maxX: 330,
    minY: detailY - 92,
    maxY: detailY - 72,
  });
  const [departureTime, arrivalTime] = timingItem?.text
    ? timingItem.text.split(/\s*-\s*/)
    : [departureTimeItem?.text ?? null, arrivalTimeItem?.text ?? null];
  const flightNumber = flightNumberItem?.text ?? null;

  if (!flightNumber || !departureCode || !arrivalCode) {
    return null;
  }

  return {
    key: flightNumber.replace(/\s+/g, "-").toLowerCase(),
    label: `${flightNumber} - ${departureCode} to ${arrivalCode}`,
    airline:
      airlineItem?.text.match(/^(.+?)\s+[A-Z]{2}\s+\d{2,4}$/i)?.[1] ??
      airlineItem?.text ??
      null,
    flightNumber,
    cabinClass: classItem?.text ?? null,
    departureCity: departureLocation.city,
    arrivalCity: arrivalLocation.city,
    departureAirport,
    arrivalAirport,
    departureTerminal: departureLocation.terminal,
    arrivalTerminal: arrivalLocation.terminal,
    departureDate: parseCueDate(departureDateItem?.text ?? null),
    arrivalDate: parseCueDate(arrivalDateItem?.text ?? null),
    departureTime: departureTime ?? null,
    arrivalTime: arrivalTime ?? null,
    duration:
      parseCueDuration(durationItem?.text ?? null) ??
      ((departureTime ?? null) && (arrivalTime ?? null)
        ? (() => {
            const [departureHour, departureMinute] = (departureTime ?? "00:00")
              .split(":")
              .map(Number);
            const [arrivalHour, arrivalMinute] = (arrivalTime ?? "00:00")
              .split(":")
              .map(Number);
            const departureMinutes = departureHour * 60 + departureMinute;
            const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
            const totalMinutes =
              arrivalMinutes >= departureMinutes
                ? arrivalMinutes - departureMinutes
                : arrivalMinutes + 24 * 60 - departureMinutes;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours} Hour ${minutes} Minutes`;
          })()
        : null),
  };
}

export function mapCueTravelMulti(lines: PdfLine[]): PartialFlightTicketDraft | null {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");

  const itineraryRows = collectCueItems(items, {
    minX: 120,
    maxX: 180,
    minY: 680,
    maxY: 705,
    pattern: /^[A-Z]{3}-[A-Z]{3}$/i,
  })
    .map((item) => item.y)
    .sort((left, right) => right - left);

  if (itineraryRows.length < 2) {
    return null;
  }

  const detailFlightRows = collectCueItems(items, {
    minX: 15,
    maxX: 65,
    minY: 385,
    maxY: 645,
    pattern: /^[A-Z]{2}\s+\d{2,4}$/i,
  })
    .map((item) => item.y)
    .sort((left, right) => right - left);

  const flightOptions = itineraryRows
    .map((rowY, index) => buildCueTravelOption(items, rowY, detailFlightRows[index] ?? 0))
    .filter((option): option is FlightOption => !!option);

  if (flightOptions.length < 2) {
    return null;
  }

  const selectedFlightOption = flightOptions[0];
  const passengers = parseCuePassenger(items);
  const checkedBaggageItem = findCueItem(items, {
    minX: 435,
    maxX: 470,
    minY: 530,
    maxY: 552,
  });
  const ticketNumber = extractCueTicketNumber(items);
  const pnrItem = findCueItem(items, {
    minX: 440,
    maxX: 590,
    minY: 385,
    maxY: 654,
    pattern: /^Airline Reference\s:\s[A-Z0-9]{6}$/i,
  });

  for (const passenger of passengers) {
    passenger.baggage = checkedBaggageItem?.text ?? null;
    passenger.ticketNumber = ticketNumber;
  }

  return {
    provider: "CUE_TRAVEL",
    pnr: pnrItem?.text.match(/[A-Z0-9]{6}$/i)?.[0] ?? null,
    ticketNumber,
    airline: selectedFlightOption.airline ?? null,
    flightNumber: selectedFlightOption.flightNumber ?? null,
    cabinClass: selectedFlightOption.cabinClass ?? null,
    departureCity: selectedFlightOption.departureCity ?? null,
    arrivalCity: selectedFlightOption.arrivalCity ?? null,
    departureAirport: selectedFlightOption.departureAirport ?? null,
    arrivalAirport: selectedFlightOption.arrivalAirport ?? null,
    departureTerminal: selectedFlightOption.departureTerminal ?? null,
    arrivalTerminal: selectedFlightOption.arrivalTerminal ?? null,
    departureDate: selectedFlightOption.departureDate ?? null,
    arrivalDate: selectedFlightOption.arrivalDate ?? null,
    departureTime: selectedFlightOption.departureTime ?? null,
    arrivalTime: selectedFlightOption.arrivalTime ?? null,
    duration: selectedFlightOption.duration ?? null,
    selectedFlightOptionKey: selectedFlightOption.key,
    flightOptions,
    rawText,
    passengers,
    quantity: Math.max(passengers.length, 1),
    farePerPax: null,
    grandTotal: null,
  };
}
