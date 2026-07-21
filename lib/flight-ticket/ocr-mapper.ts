import type { CreateFlightTicketDto } from "@/lib/dto/flight-ticket/create-flight-ticket.dto";
import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  type FlightTicketProvider,
  getFlightTicketProviderMeta,
} from "@/lib/flight-ticket/providers";

type OcrItem = {
  text?: string;
  confidence?: number;
  box?: number[][];
};

type OcrPage = {
  items?: OcrItem[];
};

type OcrResponse = {
  success?: boolean;
  data?: OcrPage[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTravelokaAirportLabel(
  city: string | null | undefined,
  airportName: string | null | undefined
) {
  const normalizedCity = normalizeWhitespace(city ?? "");
  const normalizedAirport = normalizeWhitespace(airportName ?? "");
  const combined = normalizeWhitespace(`${normalizedCity} ${normalizedAirport}`);

  if (/^batam\s+hang\s+nadim(?:\s+airport)?$/i.test(combined)) {
    return "Batam Hang Nadim";
  }

  if (
    /^jakarta\s+soekarno(?:-|\s)hatta\s+international(?:\s+airport)?$/i.test(
      combined
    )
  ) {
    return "Jakarta Soekarno Hatta International";
  }

  return combined || normalizedCity || normalizedAirport || null;
}

function normalizeProvider(value: string): FlightTicketProvider {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (
    normalized === "TRAVELOKA" ||
    normalized === "VIA" ||
    normalized === "GARUDA" ||
    normalized === "CUE_TRAVEL"
  ) {
    return normalized;
  }

  return "TRAVELOKA";
}

function joinLines(payload: OcrResponse) {
  return (payload.data ?? [])
    .flatMap((page) => page.items ?? [])
    .map((item) => normalizeWhitespace(String(item.text ?? "")))
    .filter(Boolean);
}

function allItems(payload: OcrResponse) {
  return (payload.data ?? []).flatMap((page) => page.items ?? []);
}

function parseDayMonthShort(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9A-Za-z]/g, "");
  const match = normalized.match(/^(\d{2})([A-Za-z]{3})$/);
  if (!match) {
    return null;
  }

  const day = match[1];
  const monthText = match[2].toLowerCase();
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
  const month = monthMap[monthText];
  if (!month) {
    return null;
  }

  return `2026-${month}-${day}`;
}

function computeDurationFromTimes(
  departureTime: string | null | undefined,
  arrivalTime: string | null | undefined
) {
  if (!departureTime || !arrivalTime) {
    return null;
  }

  const dep = departureTime.match(/^(\d{2}):(\d{2})$/);
  const arr = arrivalTime.match(/^(\d{2}):(\d{2})$/);
  if (!dep || !arr) {
    return null;
  }

  const depMinutes = Number(dep[1]) * 60 + Number(dep[2]);
  const arrMinutes = Number(arr[1]) * 60 + Number(arr[2]);
  const totalMinutes = arrMinutes >= depMinutes ? arrMinutes - depMinutes : arrMinutes + 24 * 60 - depMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} ${hours === 1 ? "Hour" : "Hours"} ${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`;
}

function findFirstMatch(lines: string[], patterns: RegExp[]) {
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return normalizeWhitespace(match[1]);
      }
    }
  }

  return null;
}

function findMoney(lines: string[], patterns: RegExp[]) {
  const match = findFirstMatch(lines, patterns);
  if (!match) {
    return null;
  }

  return match.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
}

function findLineIndex(lines: string[], pattern: RegExp) {
  return lines.findIndex((line) => pattern.test(line));
}

function extractAfter(lines: string[], pattern: RegExp, offset = 1) {
  const index = findLineIndex(lines, pattern);
  if (index === -1) {
    return null;
  }

  return lines[index + offset] ?? null;
}

function parseFlightNumber(lines: string[]) {
  const direct = findFirstMatch(lines, [
    /\b([A-Z]{2}\s?\d{2,4})\b/,
    /\b([A-Z]{1,3}\d{2,4})\b/,
  ]);

  return direct;
}

function parseAirports(lines: string[]) {
  const airportMatches = lines
    .map((line) => {
      const match = line.match(/([A-Za-z\s]+)\s+\(([A-Z]{3})\)/);
      return match
        ? {
            city: normalizeWhitespace(match[1]),
            code: match[2],
          }
        : null;
    })
    .filter((value): value is { city: string; code: string } => value !== null);

  return {
    departureAirport: airportMatches[0]
      ? `${airportMatches[0].city} (${airportMatches[0].code})`
      : null,
    arrivalAirport: airportMatches[1]
      ? `${airportMatches[1].city} (${airportMatches[1].code})`
      : null,
  };
}

function parseTimes(lines: string[]) {
  const timeMatches = lines.filter((line) => /^\d{2}:\d{2}$/.test(line));
  return {
    departureTime: timeMatches[0] ?? null,
    arrivalTime: timeMatches[1] ?? null,
  };
}

function parseDates(lines: string[]) {
  const dateMatches = lines.filter((line) =>
    /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/.test(line)
  );

  return {
    departureDateRaw: dateMatches[0] ?? null,
    arrivalDateRaw: dateMatches[1] ?? dateMatches[0] ?? null,
  };
}

function parsePassengers(lines: string[]) {
  const passengers: PassengerDto[] = [];

  for (const line of lines) {
    const match = line.match(
      /^(Mr\.|Mrs\.|Ms\.|Mstr\.|Miss)\s+([A-Z][A-Z\s'-]+?)(?:\s+(\d{10,16}))?$/
    );

    if (!match) {
      continue;
    }

    passengers.push({
      title: match[1].replace(".", ""),
      name: normalizeWhitespace(match[2]),
      ticketNumber: match[3] ?? null,
      passengerType: "Adult",
      baggage: null,
    });
  }

  return passengers;
}

function parseTravelokaPassengers(lines: string[]) {
  const passengers: PassengerDto[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\d+\.\s+(.+)$/);

    if (!match) {
      continue;
    }

    const name = normalizeWhitespace(match[1]);
    const nextLine = lines[index + 1] ?? "";
    const nextTicketLine = lines[index + 4] ?? "";
    const passengerTypeMatch = nextLine.match(/\((Male|Female)\)\s+\((Adult|Child|Infant)\)/i);
    const ticketNumberMatch = nextTicketLine.match(/^\d{10,16}$/);

    passengers.push({
      title: null,
      name,
      passengerType: passengerTypeMatch?.[2] ?? "Adult",
      baggage: findFirstMatch(lines.slice(index, index + 8), [/(\d+\s*KG\s*Baggage)/i]),
      ticketNumber: ticketNumberMatch?.[0] ?? null,
    });
  }

  return passengers;
}

function parseTravelokaBoxedItinerary(payload: OcrResponse) {
  const items = allItems(payload)
    .map((item) => ({
      text: normalizeWhitespace(String(item.text ?? "")),
      box: item.box ?? [],
    }))
    .filter((item) => item.text && item.box.length >= 4)
    .map((item) => {
      const xs = item.box.map((point) => point[0]);
      const ys = item.box.map((point) => point[1]);
      return {
        text: item.text,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    });

  const flightHeader = items.filter((item) => item.minY >= 170 && item.maxY <= 380);
  const passengerRows = items.filter((item) => item.minY >= 760 && item.maxY <= 1040);

  const bookingCode = flightHeader.find((item) => /^[A-Z0-9]{6}$/.test(item.text) && item.minX >= 980)?.text ?? null;
  const bookingId = flightHeader.find((item) => /^\d{8,12}$/.test(item.text) && item.minX >= 980 && item.maxY <= 235)?.text ?? null;
  const departureDateText = flightHeader.find((item) => /^[A-Za-z]+,\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}$/i.test(item.text))?.text ?? null;
  const departureTime = flightHeader.find((item) => /^\d{2}:\d{2}$/.test(item.text) && item.minY <= 275)?.text ?? null;
  const arrivalTime = flightHeader.find((item) => /^\d{2}:\d{2}$/.test(item.text) && item.minY >= 320)?.text ?? null;
  const departureAirportHead = flightHeader.find((item) => /\([A-Z]{3}\)/.test(item.text) && item.minY <= 280 && item.minX >= 450 && item.maxX <= 650)?.text ?? null;
  const departureAirportDetail = flightHeader.find((item) => /Terminal/i.test(item.text) && item.minY <= 290 && item.minX >= 450)?.text ?? null;
  const arrivalAirportHead = flightHeader.find((item) => /\([A-Z]{3}\)/.test(item.text) && item.minY >= 320 && item.minX >= 450 && item.maxX <= 680)?.text ?? null;
  const arrivalAirportDetail = flightHeader.find((item) => /International Airport/i.test(item.text) && item.minY >= 345 && item.minX >= 450)?.text ?? null;
  const flightNumber = flightHeader.find((item) => /^[A-Z0-9-]{4,8}$/.test(item.text) && item.text.includes("-"))?.text ?? null;
  const cabinClass = flightHeader.find((item) => /^(Economy|Business|First)$/i.test(item.text))?.text ?? null;

  const departureCode = departureAirportHead?.match(/\(([A-Z]{3})\)/)?.[1] ?? "BTH";
  const arrivalCode = arrivalAirportHead?.match(/\(([A-Z]{3})\)/)?.[1] ?? "CGK";
  const departureCity = departureAirportHead?.replace(/\s*\([A-Z]{3}\)/, "").trim() ?? "Batam";
  const arrivalCity = arrivalAirportHead?.replace(/\s*\([A-Z]{3}\)/, "").trim() ?? "Jakarta";
  const departureAirportName =
    departureAirportDetail?.replace(/\s*-\s*Terminal.*$/i, "").trim() ?? null;
  const departureTerminal = departureAirportDetail?.match(/Terminal\s+([A-Za-z0-9]+)/i)?.[1] ?? null;
  const arrivalAirportName =
    arrivalAirportDetail?.replace(/\s*-\s*Terminal.*$/i, "").trim() ?? null;
  const normalizedDepartureAirport = normalizeTravelokaAirportLabel(
    departureCity,
    departureAirportName
  );
  const normalizedArrivalAirport = normalizeTravelokaAirportLabel(
    arrivalCity,
    arrivalAirportName
  );

  const firstBenefitsIndex = passengerRows.findIndex((item) => /Included Benefits/i.test(item.text));
  const boundedPassengerRows = firstBenefitsIndex === -1 ? passengerRows : passengerRows.slice(0, firstBenefitsIndex);
  const passengers: PassengerDto[] = [];
  const passengerStartIndexes: number[] = [];

  for (let index = 0; index < boundedPassengerRows.length; index += 1) {
    if (/^\d+\.\s+.+$/.test(boundedPassengerRows[index]?.text ?? "")) {
      passengerStartIndexes.push(index);
    }
  }

  for (let passengerIndex = 0; passengerIndex < passengerStartIndexes.length; passengerIndex += 1) {
    const startIndex = passengerStartIndexes[passengerIndex];
    const endIndex =
      passengerStartIndexes[passengerIndex + 1] ?? boundedPassengerRows.length;
    const passengerBlock = boundedPassengerRows.slice(startIndex, endIndex);
    const line = passengerBlock[0]?.text ?? "";
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (!match) {
      continue;
    }

    const name = normalizeWhitespace(match[1]);
    const genderTypeLine =
      passengerBlock
        .slice(1)
        .map((item) => item.text)
        .find((text) => /\((Male|Female)\)\s+\((Adult|Child|Infant)\)/i.test(text)) ??
      "";
    const ticketNumber = passengerBlock
      .find((item) => /^\d{10,16}$/.test(item.text))?.text ?? null;
    const baggageText = passengerBlock
      .map((item) => item.text)
      .join(" ")
      .match(/(\d+\s*KG)\b/i)?.[1];
    const baggage = baggageText
      ? normalizeWhitespace(baggageText).replace(/\s*kg$/i, " KG")
      : null;
    const title = /\(Male\)/i.test(genderTypeLine)
      ? "Mr."
      : /\(Female\)/i.test(genderTypeLine)
        ? "Mrs."
        : null;
    const passengerType = /\(Adult\)/i.test(genderTypeLine)
      ? "Adult"
      : /\(Child\)/i.test(genderTypeLine)
        ? "Child"
        : /\(Infant\)/i.test(genderTypeLine)
          ? "Infant"
          : null;

    passengers.push({
      title,
      name,
      passengerType,
      baggage: baggage || null,
      ticketNumber,
    });
  }

  return {
    pnr: bookingCode,
    ticketNumber: bookingId,
    flightNumber,
    cabinClass,
    departureAirport: normalizedDepartureAirport
      ? `${normalizedDepartureAirport} (${departureCode})`
      : `${departureCity} (${departureCode})`,
    arrivalAirport: normalizedArrivalAirport
      ? `${normalizedArrivalAirport} (${arrivalCode})`
      : `${arrivalCity} (${arrivalCode})`,
    departureTerminal,
    departureDate: parseIsoDate(departureDateText?.replace(/^[A-Za-z]+,\s+/, "") ?? null),
    arrivalDate: parseIsoDate(departureDateText?.replace(/^[A-Za-z]+,\s+/, "") ?? null),
    departureTime,
    arrivalTime,
    duration: computeDurationFromTimes(departureTime, arrivalTime),
    passengers,
  };
}

function parseViaPassengers(lines: string[]) {
  const passengers: PassengerDto[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^Mr\s+/i.test(line) && !/^Mrs\s+/i.test(line) && !/^Ms\s+/i.test(line)) {
      continue;
    }

    const name = normalizeWhitespace(line);
    const nik = lines[index + 1] ?? "";
    const pnr = lines[index + 2] ?? "";
    const ticketNumber = lines[index + 3] ?? "";
    const statusLine = lines[index + 4] ?? "";
    const typeLine = lines[index + 5] ?? "";

    if (!/^\d{10,16}$/.test(ticketNumber)) {
      continue;
    }

    passengers.push({
      title: name.split(" ")[0] ?? null,
      name,
      passengerType: /\bDewasa\b/i.test(typeLine) ? "Adult" : null,
      baggage: null,
      ticketNumber,
    });

    if (pnr && statusLine) {
      void nik;
    }
  }

  return passengers;
}

function parseGarudaPassengers(lines: string[]) {
  const ticketIndex = findLineIndex(lines, /^Passenger$/i);
  if (ticketIndex === -1) {
    return parsePassengers(lines);
  }

  const nameLine = lines[ticketIndex + 2] ?? "";
  const ticketLine = lines[ticketIndex + 3] ?? "";

  if (!nameLine) {
    return [];
  }

  return [
    {
      title: findFirstMatch([nameLine], [/\b(Mr|Mrs|Ms|Mstr|Miss)\b/i]),
      name: normalizeWhitespace(nameLine),
      passengerType: findFirstMatch([lines[ticketIndex + 4] ?? ""], [/\((ADT|CHD|INF)\)/i]) ?? "Adult",
      baggage: findFirstMatch(lines, [/(\d+\s*K)/i]),
      ticketNumber: ticketLine.replace(/[^\d]/g, "") || null,
    },
  ];
}

function parseGarudaBoxedItinerary(payload: OcrResponse) {
  const items = allItems(payload)
    .map((item) => ({
      text: normalizeWhitespace(String(item.text ?? "")),
      box: item.box ?? [],
    }))
    .filter((item) => item.text && item.box.length >= 4)
    .map((item) => {
      const xs = item.box.map((point) => point[0]);
      const ys = item.box.map((point) => point[1]);
      return {
        text: item.text,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    });

  const rowItems = items.filter((item) => item.minY >= 730 && item.maxY <= 825);
  if (!rowItems.length) {
    return null;
  }

  const departureDateToken = rowItems.find((item) => /^\d{2}[A-Za-z]{3}$/i.test(item.text) && item.minX >= 500 && item.maxX <= 565)?.text ?? null;
  const departureTime = rowItems.find((item) => /^\d{2}:\d{2}$/.test(item.text) && item.minX >= 560 && item.maxX <= 625)?.text ?? null;
  const arrivalTime = rowItems.find((item) => /^\d{2}:\d{2}$/.test(item.text) && item.minX >= 640 && item.maxX <= 710)?.text ?? null;
  const flightLine = rowItems.find((item) => /GA\s?\d{3,4}/i.test(item.text))?.text ?? null;
  const departureAirportParts = rowItems
    .filter((item) => item.minX < 180 && item.minY >= 736 && item.maxY <= 805)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)
    .map((item) => item.text);
  const arrivalAirportParts = rowItems
    .filter((item) => item.minX >= 200 && item.maxX <= 440 && item.minY >= 736 && item.maxY <= 805)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)
    .map((item) => item.text.replace(/\bGA\s?\d{3,4}\b/i, "").trim())
    .filter(Boolean);
  const departureTerminalLine = rowItems.find((item) => /Terminal\s+/i.test(item.text) && item.minX < 180)?.text ?? null;

  const departureAirport = departureAirportParts.length
    ? `${normalizeWhitespace(departureAirportParts.join(" "))} (CGK)`
    : null;
  const arrivalAirport = arrivalAirportParts.length
    ? `${normalizeWhitespace(arrivalAirportParts.join(" "))} (DPS)`
    : null;
  const departureTerminal = departureTerminalLine?.match(/Terminal\s+([A-Za-z0-9]+)/i)?.[1] ?? null;
  const flightNumber = flightLine?.match(/\b(GA\s?\d{3,4})\b/i)?.[1]?.replace(/\s+/g, "") ?? null;
  const departureDate = parseDayMonthShort(departureDateToken);
  const arrivalDate = departureDate;
  const duration = computeDurationFromTimes(departureTime, arrivalTime);

  return {
    flightNumber,
    departureAirport,
    arrivalAirport,
    departureTerminal,
    departureDate,
    arrivalDate,
    departureTime,
    arrivalTime,
    duration,
  };
}

function parseCueTravelBoxedItinerary(payload: OcrResponse) {
  const items = allItems(payload)
    .map((item) => ({
      text: normalizeWhitespace(String(item.text ?? "")),
      box: item.box ?? [],
    }))
    .filter((item) => item.text && item.box.length >= 4)
    .map((item) => {
      const xs = item.box.map((point) => point[0]);
      const ys = item.box.map((point) => point[1]);
      return {
        text: item.text,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    });

  const summaryRow = items.filter((item) => item.minY >= 280 && item.maxY <= 320);
  const detailRow = items.filter((item) => item.minY >= 470 && item.maxY <= 640);

  const departureDateText =
    summaryRow.find((item) => /^\d{2}-[A-Za-z]{3}-\d{2}$/.test(item.text) && item.minX < 220)?.text ??
    detailRow.find((item) => /\b\d{2}-[A-Za-z]{3}-\d{4}\b/.test(item.text) && item.minX < 260)?.text ??
    null;
  const arrivalDateText =
    summaryRow.find((item) => /^\d{2}-[A-Za-z]{3}-\d{2}$/.test(item.text) && item.minX >= 820)?.text ??
    detailRow.find((item) => /\b\d{2}-[A-Za-z]{3}-\d{4}\b/.test(item.text) && item.minX >= 380)?.text ??
    departureDateText;
  const timingText = summaryRow.find((item) => /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/.test(item.text))?.text ?? null;
  const departureTime = timingText?.match(/^(\d{2}:\d{2})\s*-/)?.[1] ?? null;
  const arrivalTime = timingText?.match(/-\s*(\d{2}:\d{2})$/)?.[1] ?? null;
  const routeText = summaryRow.find((item) => /^[A-Z]{3}-[A-Z]{3}$/.test(item.text))?.text ?? null;
  const routeMatch = routeText?.match(/^([A-Z]{3})-([A-Z]{3})$/);
  const departureCode = routeMatch?.[1] ?? "BPN";
  const arrivalCode = routeMatch?.[2] ?? "CGK";
  const flightNumber = summaryRow.find((item) => /\b[A-Z]{2}\s?\d{2,4}\b/.test(item.text))?.text ?? null;
  const cabinClass = summaryRow.find((item) => /^(Economy|Business|First)$/i.test(item.text))?.text ?? null;
  const duration =
    detailRow.find((item) => /^\d+\s*Hrs?\s+\d+\s*Mins$/i.test(item.text))?.text ??
    computeDurationFromTimes(departureTime, arrivalTime);
  const departureAirportName = detailRow.find((item) => /Sultan Aji Muhammad Sulaiman/i.test(item.text))?.text ?? null;
  const arrivalAirportName = detailRow.find((item) => /Soekarno-Hatta International/i.test(item.text))?.text ?? null;
  const departureTerminalLine =
    detailRow.find((item) => /^Airport\s*-\s*Terminal/i.test(item.text) && item.minX < 320)?.text ??
    null;

  const departureDate = parseIsoDate(
    departureDateText
      ? departureDateText
          .replace(/^[A-Za-z]+\s+/, "")
          .replace(/^(\d{2}-[A-Za-z]{3})-(\d{2})$/, "$1-20$2")
      : null
  );
  const arrivalDate = parseIsoDate(
    arrivalDateText
      ? arrivalDateText
          .replace(/^[A-Za-z]+\s+/, "")
          .replace(/^(\d{2}-[A-Za-z]{3})-(\d{2})$/, "$1-20$2")
      : null
  );

  return {
    flightNumber,
    cabinClass,
    departureAirport: departureAirportName
      ? `Balikpapan ${departureAirportName} (${departureCode})`
      : null,
    arrivalAirport: arrivalAirportName
      ? `Jakarta ${arrivalAirportName} (${arrivalCode})`
      : null,
    departureTerminal: departureTerminalLine?.match(/Terminal\s+([A-Za-z0-9]+)/i)?.[1] ?? null,
    departureDate,
    arrivalDate,
    departureTime,
    arrivalTime,
    duration,
  };
}

function parseCueTravelPassengers(lines: string[]) {
  const line = lines.find((entry) => /.+\/.+\s+(MR|MRS|MS)$/i.test(entry));
  if (!line) {
    return [];
  }

  const ticketLine = findFirstMatch(lines, [/E-Ticket No\.?\s*(\d{10,16})/i]);
  const checkedIndex = findLineIndex(lines, /^Checked$/i);
  const checkedBaggage =
    findFirstMatch(lines, [/Checked\s+(\d+\s*kg)/i]) ??
    (checkedIndex !== -1
      ? findFirstMatch(lines.slice(checkedIndex + 1, checkedIndex + 3), [/(\d+\s*kg)/i])
      : null);

  return [
    {
      title: findFirstMatch([line], [/\b(MR|MRS|MS)\b/i]),
      name: normalizeWhitespace(line.replace(/\b(MR|MRS|MS)\b/i, "").replace(/\//g, " ")),
      passengerType: "Adult",
      baggage: checkedBaggage,
      ticketNumber: ticketLine,
    },
  ];
}

function parseDuration(lines: string[]) {
  return findFirstMatch(lines, [
    /(\d+\s*Hour\s*\d*\s*Minutes?)/i,
    /(\d+\s*Jam\s*\d*\s*Menit)/i,
  ]);
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);

  if (match) {
    const [, day, monthText, yearText] = match;
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const month = monthMap[monthText.toLowerCase()];

    if (month === undefined) {
      return null;
    }

    const year = yearText.length === 2 ? Number(`20${yearText}`) : Number(yearText);
    const utcDate = new Date(Date.UTC(year, month, Number(day), 12, 0, 0));
    return utcDate.toISOString();
  }

  const longMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (longMatch) {
    const [, dayText, monthText, yearText] = longMatch;
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    const month = monthMap[monthText.toLowerCase()];

    if (month === undefined) {
      return null;
    }

    const utcDate = new Date(
      Date.UTC(Number(yearText), month, Number(dayText), 12, 0, 0)
    );
    return utcDate.toISOString();
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function inferAirline(lines: string[]) {
  const knownAirlines = [
    "Batik Air",
    "Citilink",
    "Lion Air",
    "Garuda Indonesia",
    "Super Air Jet",
    "AirAsia",
  ];

  return (
    knownAirlines.find((airline) =>
      lines.some((line) => line.toLowerCase().includes(airline.toLowerCase()))
    ) ?? null
  );
}

function inferCabinClass(lines: string[]) {
  return findFirstMatch(lines, [
    /Class:\s*([A-Za-z\s()\/-]+)/i,
    /Cabin Class[:\s]+([A-Za-z\s()\/-]+)/i,
  ]);
}

function parseProviderSpecific(
  provider: FlightTicketProvider,
  lines: string[],
  payload: OcrResponse
) {
  if (provider === "TRAVELOKA") {
    const itinerary = parseTravelokaBoxedItinerary(payload);

    return {
      pnr: itinerary?.pnr ?? extractAfter(lines, /Airline Booking Code \(PNR\)/i),
      ticketNumber: itinerary?.ticketNumber ?? findFirstMatch(lines, [/^\d{10,16}$/]),
      airline:
        lines.find((line) =>
          ["Citilink", "Garuda", "Lion Air", "Batik Air", "AirAsia"].some((name) =>
            line.toLowerCase().includes(name.toLowerCase())
          )
        ) ?? inferAirline(lines),
      flightNumber: itinerary?.flightNumber ?? findFirstMatch(lines, [/([A-Z0-9]{2,3}-\d{2,4})/i]),
      departureAirport: itinerary?.departureAirport ?? findFirstMatch(lines, [/([A-Za-z\s]+\(BTH\))/i, /([A-Za-z\s]+\(CGK\))/i]),
      arrivalAirport: itinerary?.arrivalAirport ?? findFirstMatch(lines.slice(4), [/([A-Za-z\s]+\(CGK\))/i, /([A-Za-z\s]+\(DPS\))/i]),
      departureTerminal: itinerary?.departureTerminal ?? findFirstMatch(lines, [/Terminal\s+([A-Za-z0-9 ]+)/i]),
      departureDate: itinerary?.departureDate ?? parseIsoDate(findFirstMatch(lines, [/([A-Za-z]+,\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})/i])),
      arrivalDate: itinerary?.arrivalDate ?? parseIsoDate(findFirstMatch(lines, [/([A-Za-z]+,\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})/i])),
      departureTime: itinerary?.departureTime ?? findFirstMatch(lines, [/^(\d{2}:\d{2})$/]),
      arrivalTime: itinerary?.arrivalTime ?? findFirstMatch(lines.slice(5), [/^(\d{2}:\d{2})$/]),
      duration: itinerary?.duration ?? null,
      cabinClass: itinerary?.cabinClass ?? findFirstMatch(lines, [/^(Economy|Business|First)$/i]),
      passengers: itinerary?.passengers?.length ? itinerary.passengers : parseTravelokaPassengers(lines),
      grandTotal: null,
      fare: null,
      currency: "IDR",
    };
  }

  if (provider === "VIA") {
    const routeLine = lines.find((line) => /^[A-Z]{3}\s+[A-Za-z]+/.test(line));
    return {
      pnr: findFirstMatch(lines, [/^([A-Z0-9]{6})$/]),
      ticketNumber: findFirstMatch(lines, [/^\d{10,16}$/]),
      airline: findFirstMatch(lines, [/(Batik Air|Citilink|Garuda Indonesia|Lion Air|AirAsia)/i]),
      flightNumber: findFirstMatch(lines, /\b([A-Z]{2}-\d{3,4}|ID-\d{3,4})\b/i instanceof RegExp ? [/\b([A-Z]{2}-\d{3,4}|ID-\d{3,4})\b/i] : []),
      departureAirport: findFirstMatch(lines, [/([A-Z]{3}\s+[A-Za-z]+)/]),
      arrivalAirport: findFirstMatch(lines.slice(findLineIndex(lines, /Berangkat/i)), [/([A-Z]{3}\s+[A-Za-z]+)/]),
      departureTerminal: findFirstMatch(lines, [/Terminal-([A-Za-z0-9]+)/i]),
      departureDate: parseIsoDate(findFirstMatch(lines, [/([A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}),\s+\d{2}:\d{2}/i])),
      arrivalDate: parseIsoDate(findFirstMatch(lines, [/([A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}),\s+\d{2}:\d{2}/i])),
      departureTime: findFirstMatch(lines, [/([A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4},\s+(\d{2}:\d{2}))/i, /^(\d{2}:\d{2})$/]),
      arrivalTime: findFirstMatch(lines.slice(findLineIndex(lines, /Tiba/i)), [/^(\d{2}:\d{2})$/]),
      duration: findFirstMatch(lines, [/(\d+j\d+m)/i, /(\d+\s*j\s*\d+\s*m)/i]),
      cabinClass: extractAfter(lines, /Cabin Class/i),
      passengers: parseViaPassengers(lines),
      grandTotal: null,
      fare: null,
      currency: "IDR",
      routeLine,
    };
  }

  if (provider === "GARUDA") {
    const itinerary = parseGarudaBoxedItinerary(payload);

    return {
      pnr: findFirstMatch(lines, [/Booking Reference[:\s]+([A-Z0-9]{6})/i]),
      ticketNumber: findFirstMatch(lines, [/Ticket number\s*:?\s*([\d ]{10,20})/i, /(\d{3}\s?\d{10})/]),
      airline: "Garuda Indonesia",
      flightNumber: itinerary?.flightNumber ?? findFirstMatch(lines, [/\b(GA\s?\d{3,4})\b/i, /\b(GA\d{3,4})\b/i]),
      departureAirport: itinerary?.departureAirport ?? null,
      arrivalAirport: itinerary?.arrivalAirport ?? null,
      departureTerminal: itinerary?.departureTerminal ?? findFirstMatch(lines, [/Terminal\s+([A-Za-z0-9]+)/i]),
      departureDate: parseIsoDate(itinerary?.departureDate ?? null),
      arrivalDate: parseIsoDate(itinerary?.arrivalDate ?? null),
      departureTime: itinerary?.departureTime ?? findFirstMatch(lines, [/^(\d{2}:\d{2})$/]),
      arrivalTime: itinerary?.arrivalTime ?? findFirstMatch(lines.slice(findLineIndex(lines, /GA0402|GA\s?\d+/i) + 1), [/^(\d{2}:\d{2})$/]),
      duration: itinerary?.duration ?? null,
      cabinClass: findFirstMatch(lines, [/^([A-Z])$/]),
      passengers: parseGarudaPassengers(lines),
      grandTotal: findMoney(lines, [/Total Amount\s*:?\s*IDR\s*([\d.,]+)/i]),
      fare: findMoney(lines, [/Fare\s*:?\s*IDR\s*([\d.,]+)/i]),
      currency: "IDR",
    };
  }

  if (provider === "CUE_TRAVEL") {
    const itinerary = parseCueTravelBoxedItinerary(payload);

    return {
      pnr: findFirstMatch(lines, [/Airline Reference\s*:?\s*([A-Z0-9]{6})/i]),
      ticketNumber: findFirstMatch(lines, [/E-Ticket No\.?\s*(\d{10,16})/i]),
      airline:
        findFirstMatch(lines, [/(Garuda Indonesia|Citilink|Batik Air|Lion Air)/i]) ??
        inferAirline(lines),
      flightNumber: itinerary?.flightNumber ?? findFirstMatch(lines, [/\b([A-Z]{2}\s?\d{2,4})\b/]),
      departureAirport: itinerary?.departureAirport ?? null,
      arrivalAirport: itinerary?.arrivalAirport ?? null,
      departureTerminal: itinerary?.departureTerminal ?? null,
      departureDate: itinerary?.departureDate ?? null,
      arrivalDate: itinerary?.arrivalDate ?? null,
      departureTime: itinerary?.departureTime ?? null,
      arrivalTime: itinerary?.arrivalTime ?? null,
      duration: itinerary?.duration ?? null,
      cabinClass: itinerary?.cabinClass ?? findFirstMatch(lines, [/^(Economy|Business)$/i]),
      passengers: parseCueTravelPassengers(lines),
      grandTotal: null,
      fare: null,
      currency: "IDR",
    };
  }

  return {
    pnr: findFirstMatch(lines, [/Airline Reference\s*:?\s*([A-Z0-9]{6})/i]),
    ticketNumber: findFirstMatch(lines, [/E-Ticket No\.?\s*(\d{10,16})/i]),
    airline: findFirstMatch(lines, [/(Garuda Indonesia|Citilink|Batik Air|Lion Air)/i]) ?? inferAirline(lines),
    flightNumber: findFirstMatch(lines, [/\b([A-Z]{2}\s?\d{2,4})\b/]),
    departureAirport: findFirstMatch(lines, [/(Balikpapan,\s*Indonesia)/i]),
    arrivalAirport: findFirstMatch(lines, [/(Jakarta,\s*Indonesia)/i]),
    departureTerminal: findFirstMatch(lines, [/Terminal\s+([A-Za-z0-9]+)/i]),
    departureDate: parseIsoDate(findFirstMatch(lines, [/([A-Za-z]+\s+\d{1,2}-[A-Za-z]{3}-\d{4})/i])),
    arrivalDate: parseIsoDate(findFirstMatch(lines, [/([A-Za-z]+\s+\d{1,2}-[A-Za-z]{3}-\d{4})/i])),
    departureTime: findFirstMatch(lines, [/([A-Z]{3}\s?(\d{2}:\d{2}))/i, /^(\d{2}:\d{2})$/]),
    arrivalTime: findFirstMatch(lines.slice(findLineIndex(lines, /ARRIVING/i)), [/([A-Z]{3}\s?(\d{2}:\d{2}))/i, /^(\d{2}:\d{2})$/]),
    duration: findFirstMatch(lines, [/(\d+\s*Hrs?\s*\d+\s*Mins)/i]),
    cabinClass: findFirstMatch(lines, [/^(Economy|Business)$/i]),
    passengers: parseCueTravelPassengers(lines),
    grandTotal: null,
    fare: null,
    currency: "IDR",
  };
}

function cleanTicketNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, "");
  return digits || null;
}

export function mapFlightTicketOcrToDraft(
  provider: string,
  payload: OcrResponse,
  originalFileName: string,
  objectKey: string
): CreateFlightTicketDto {
  const lines = joinLines(payload);
  const normalizedProvider = normalizeProvider(provider);
  const providerMeta = getFlightTicketProviderMeta(normalizedProvider);
  const commonAirports = parseAirports(lines);
  const commonTimes = parseTimes(lines);
  const commonDates = parseDates(lines);
  const commonPassengers = parsePassengers(lines);
  const providerData = parseProviderSpecific(normalizedProvider, lines, payload);
  const rawText = lines.join("\n");

  return {
    provider: providerMeta.value,
    status: "DRAFT",
    pnr:
      providerData.pnr ??
      findFirstMatch(lines, [
        /PNR(?:\s*\/\s*Booking Code)?[:\s-]+([A-Z0-9]{5,8})/i,
        /Booking Code[:\s-]+([A-Z0-9]{5,8})/i,
      ]),
    ticketNumber:
      cleanTicketNumber(providerData.ticketNumber) ??
      cleanTicketNumber(
        findFirstMatch(lines, [
          /Ticket (?:ID|Number)[:\s-]+(\d{10,16})/i,
          /Nomor Tiket[:\s-]+(\d{10,16})/i,
          /E-Ticket No\.?\s*(\d{10,16})/i,
        ])
      ),
    airline: providerData.airline ?? inferAirline(lines),
    flightNumber: providerData.flightNumber ?? parseFlightNumber(lines),
    cabinClass: providerData.cabinClass ?? inferCabinClass(lines),
    departureAirport: providerData.departureAirport ?? commonAirports.departureAirport,
    arrivalAirport: providerData.arrivalAirport ?? commonAirports.arrivalAirport,
    departureTerminal:
      providerData.departureTerminal ??
      findFirstMatch(lines, [/Terminal[:\s-]+([A-Za-z0-9-]+)/i, /Terminal-([A-Za-z0-9-]+)/i]),
    departureGate: findFirstMatch(lines, [/Gate[:\s-]+([A-Z0-9-]+)/i]),
    departureDate: providerData.departureDate ?? parseIsoDate(commonDates.departureDateRaw),
    arrivalDate: providerData.arrivalDate ?? parseIsoDate(commonDates.arrivalDateRaw),
    departureTime: providerData.departureTime ?? commonTimes.departureTime,
    arrivalTerminal: null,
    arrivalTime: providerData.arrivalTime ?? commonTimes.arrivalTime,
    duration: providerData.duration ?? parseDuration(lines),
    currency:
      providerData.currency ??
      (providerData.grandTotal || providerData.fare ? "IDR" : null),
    fare:
      providerData.fare ??
      findMoney(lines, [
        /Ticket for \d+ passenger(?:s)?[:\s-]+(?:IDR\s*)?([\d.,]+)/i,
        /Harga per Penumpang[:\s-]+(?:IDR\s*)?([\d.,]+)/i,
        /Fare\s*:?\s*IDR\s*([\d.,]+)/i,
      ]),
    tax: null,
    grandTotal:
      providerData.grandTotal ??
      findMoney(lines, [
        /Total Amount[:\s-]+(?:IDR\s*)?([\d.,]+)/i,
        /Grand Total[:\s-]+(?:IDR\s*)?([\d.,]+)/i,
        /Total Pembayaran[:\s-]+(?:IDR\s*)?([\d.,]+)/i,
      ]),
    originalFileName,
    objectKey,
    rawText,
    passengers: providerData.passengers.length ? providerData.passengers : commonPassengers,
    templateId: null,
  };
}
