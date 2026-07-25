import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import type { PartialFlightTicketDraft } from "@/lib/flight-ticket/pdf-ticket-mapper.shared";
import { writeFileSync } from "fs";
import path from "path";
import { computeDuration } from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseViaIndonesianDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s+(\d{2}):(\d{2})$/i
  );
  if (!match) {
    return null;
  }

  const [, day, monthLabel, year, hour, minute] = match;
  const monthMap: Record<string, string> = {
    jan: "01",
    januari: "01",
    feb: "02",
    februari: "02",
    mar: "03",
    maret: "03",
    apr: "04",
    april: "04",
    mei: "05",
    may: "05",
    jun: "06",
    juni: "06",
    jul: "07",
    juli: "07",
    agu: "08",
    aug: "08",
    agustus: "08",
    sep: "09",
    september: "09",
    okt: "10",
    oct: "10",
    oktober: "10",
    nov: "11",
    november: "11",
    des: "12",
    dec: "12",
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

function formatViaDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Hour ${minutes} Minutes`;
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

function extractPassengerBlock(rawText: string) {
  const passengerHeaderIndex = rawText.search(/(rincian penumpang|passenger)/i);
  if (passengerHeaderIndex < 0) {
    return "";
  }

  return rawText.slice(passengerHeaderIndex);
}

function extractViaPassengersFromText(rawText: string) {
  const passengerBlock = extractPassengerBlock(rawText);
  const lines = passengerBlock
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const passengers: PassengerDto[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/\b(Mr|Mrs|Ms|Miss)\b/i.test(line)) {
      continue;
    }

    const nextLine = lines[index + 1] ?? "";
    const nextNextLine = lines[index + 2] ?? "";
    const ticketNumberMatch =
      `${line} ${nextLine} ${nextNextLine}`.match(/\b[a-z]{0,3}\d{6,16}\b/i) ??
      null;
    const baggageMatch = rawText.match(/\b(?:Dewasa|Anak|Bayi)\s*:\s*([^\n]+)/i);
    const ageLine = [line, nextLine, nextNextLine].find((value) =>
      /^(Dewasa|Anak|Bayi)/i.test(value)
    ) ?? null;

    const firstNamePart = line
      .replace(/^\d+\s*/i, "")
      .replace(/\b(Mr|Mrs|Ms|Miss)\b\.?/i, "")
      .replace(/\b\d{1,3}\b$/g, "");
    const secondNamePart = nextLine
      .replace(/\b\d{10,16}\b/g, "")
      .replace(/\b[A-Z0-9]{5,}\b/g, "")
      .replace(/\bConfirmed\b/gi, "");
    const cleanName = normalizeWhitespace(
      `${firstNamePart} ${secondNamePart}`
        .replace(/\b[a-z]{0,3}\d{6,16}\b/gi, "")
        .replace(/\b\d{10,16}\b/g, "")
        .replace(/\b(Dewasa|Anak|Bayi)\b.*$/i, "")
    );

    if (!cleanName) {
      continue;
    }

    passengers.push({
      title: mapViaPassengerTitle(line),
      name: cleanName,
      passengerType: mapViaPassengerType(ageLine),
      baggage: baggageMatch?.[1] ? normalizeWhitespace(baggageMatch[1]) : null,
      ticketNumber: ticketNumberMatch?.[0] ?? null,
    });
  }

  return passengers;
}

function collectUniqueMatches(rawText: string, pattern: RegExp) {
  return [...rawText.matchAll(pattern)]
    .map((match) => normalizeWhitespace(match[1] ?? match[0] ?? ""))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function isLikelyGarbageValue(value: string | null) {
  if (!value) {
    return true;
  }

  return /^(details?|ticketing|status|asuransi|ff no|e-ticket)$/i.test(
    value.trim()
  );
}

function formatViaCity(city: string | null, code: string | null) {
  if (city && code) {
    const cleanedCity = normalizeWhitespace(
      city
        .replace(/\bNon Stop\b/gi, "")
        .replace(/\bTerminal[- ]?\d+\b/gi, "")
        .replace(/\s+-\s+/g, " ")
    );
    return `${cleanedCity} (${code})`;
  }

  return city ?? code ?? null;
}

function parseViaFlightSegment(line: string) {
  const normalizedLine = normalizeWhitespace(line);
  const cityMatches = [...normalizedLine.matchAll(/\b([A-Z]{3})\s+([A-Za-z][A-Za-z/ -]+?)(?=\s+[A-Z]{3}\s+|$)/g)];
  const flightNumberMatch = normalizedLine.match(/\b([A-Z]{1,3}-\d{3,4}|[A-Z]{1,3}\s?\d{3,4})\b/);
  const durationMatch = normalizedLine.match(/\b(\d+j\d+m|\d+j\s*\d+m|\d+m)\b/i);

  const departure = cityMatches[0]
    ? {
        code: cityMatches[0][1],
        city: cityMatches[0][2]
          .replace(/\/.*/g, "")
          .replace(/\bNon Stop\b/gi, "")
          .trim(),
      }
    : null;
  const arrival = cityMatches[1]
    ? {
        code: cityMatches[1][1],
        city: cityMatches[1][2]
          .replace(/\/.*/g, "")
          .replace(/\bNon Stop\b/gi, "")
          .trim(),
      }
    : null;

  return {
    flightNumber: flightNumberMatch?.[1]?.replace(/\s+/g, "-") ?? null,
    duration: durationMatch?.[1]?.replace(/(\d+j)(\d+m)/i, "$1 $2") ?? null,
    departureCode: departure?.code ?? null,
    departureCity: departure?.city ?? null,
    arrivalCode: arrival?.code ?? null,
    arrivalCity: arrival?.city ?? null,
  };
}

function parseViaSingleFlightBlock(lines: string[]) {
  const segmentHeaderIndex = lines.findIndex((line) =>
    /^Penerbangan\s+1\b/i.test(line)
  );
  if (segmentHeaderIndex < 0) {
    return null;
  }

  const nearbyLines = lines.slice(segmentHeaderIndex, segmentHeaderIndex + 8);
  const airlineRouteLine =
    nearbyLines.find((line) =>
      /\b(?:Garuda|Wings Air|Batik Air|Lion Air|Citilink|AirAsia|Super Air Jet)\b/i.test(
        line
      ) && /\b[A-Z]{3}\b/.test(line)
    ) ?? null;
  const detailLine =
    nearbyLines.find((line) => /\b[A-Z]{1,3}-\d{3,4}\b/i.test(line)) ?? null;
  const departureDateLine =
    nearbyLines.find((line) =>
      /\bWebCheckin Link\b.*(Sen|Sel|Rab|Kam|Jum|Sab|Min)\b.*\d{2}:\d{2}/i.test(
        line
      )
    ) ??
    nearbyLines.find((line) =>
      /^(Sen|Sel|Rab|Kam|Jum|Sab|Min)\b.*\d{2}:\d{2}/i.test(line)
    ) ??
    null;
  const arrivalDateLine =
    nearbyLines.find(
      (line) =>
        line !== departureDateLine &&
        /^(Sen|Sel|Rab|Kam|Jum|Sab|Min)\b.*\d{2}:\d{2}/i.test(line)
    ) ?? null;
  const departureDateTimeText =
    departureDateLine?.match(
      /((?:Sen|Sel|Rab|Kam|Jum|Sab|Min)\s+\d{2}\s+[A-Za-z]{3,}\s+\d{4},\s+\d{2}:\d{2})/i
    )?.[1] ?? null;
  const arrivalDateTimeText =
    arrivalDateLine?.match(
      /((?:Sen|Sel|Rab|Kam|Jum|Sab|Min)\s+\d{2}\s+[A-Za-z]{3,}\s+\d{4},\s+\d{2}:\d{2})/i
    )?.[1] ?? null;

  const routeMatches = [...(airlineRouteLine ?? "").matchAll(/\b([A-Z]{3})\s+([A-Za-z][A-Za-z/ -]+?)(?=\s+[A-Z]{3}\s+|$)/g)];
  const flightNumber =
    detailLine?.match(/\b([A-Z]{1,3}-\d{3,4}|[A-Z]{1,3}\s?\d{3,4})\b/i)?.[1]?.replace(/\s+/g, "-") ??
    null;
  const duration =
    detailLine?.match(/\b(\d+j\s*\d+m|\d+j|\d+m)\b/i)?.[1]?.replace(/(\d+j)(\d+m)/i, "$1 $2") ??
    null;
  const airline =
    airlineRouteLine?.match(
      /\b(Garuda(?: Indonesia)?|Wings Air|Batik Air|Lion Air|Citilink|AirAsia|Super Air Jet)\b/i
    )?.[1] ?? null;
  const departureTerminal =
    departureDateLine?.match(/\b(Terminal[- ]?\d+)\b/i)?.[1] ?? null;
  const arrivalTerminal =
    arrivalDateLine?.match(/\b(Terminal[- ]?\d+)\b/i)?.[1] ?? null;

  return {
    airline,
    flightNumber,
    duration,
    departureCode: routeMatches[0]?.[1] ?? null,
    departureCity: routeMatches[0]?.[2]?.replace(/\/.*/g, "").trim() ?? null,
    arrivalCode: routeMatches[1]?.[1] ?? null,
    arrivalCity: routeMatches[1]?.[2]?.replace(/\/.*/g, "").trim() ?? null,
    departureDateLine: departureDateTimeText,
    arrivalDateLine: arrivalDateTimeText,
    departureTerminal,
    arrivalTerminal,
  };
}

function parseViaText(rawText: string): PartialFlightTicketDraft | null {
  const normalizedText = rawText.replace(/\u0000/g, "");
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const pnr =
    normalizedText.match(/\bID Pemesanan\b[:\s-]*([A-Z0-9]{8,})/i)?.[1] ??
    normalizedText.match(/\bPNR\b[:\s-]*([A-Z0-9]{5,8})/i)?.[1] ??
    normalizedText.match(/\bBooking(?:\s+ID|\s+Code)?\b[:\s-]*([A-Z0-9]{5,12})/i)?.[1] ??
    null;

  const ticketNumber =
    normalizedText.match(/\bE-?Ticket\b[^\n]*?\b([A-Za-z]{0,3}\d{6,16})\b/i)?.[1] ??
    normalizedText.match(/\bsg\d{6,16}\b/i)?.[0] ??
    null;

  const singleFlight = parseViaSingleFlightBlock(lines);
  const airlines = singleFlight?.airline
    ? [singleFlight.airline]
    : collectUniqueMatches(
        normalizedText,
        /\b(Citilink|Garuda Indonesia|Garuda|Lion Air|Batik Air|Super Air Jet|AirAsia|Pelita Air|Wings Air)\b/gi
      );

  const segmentLines = lines.filter((line) =>
    /\b(?:Wings Air|Batik Air|Lion Air|Citilink|Garuda(?: Indonesia)?|AirAsia|Super Air Jet)\b/i.test(
      line
    ) && /\b[A-Z]{3}\b/.test(line)
  );
  const parsedSegments = singleFlight
    ? [singleFlight]
    : segmentLines.map((line) => parseViaFlightSegment(line));
  const flightNumbers = parsedSegments
    .map((segment) => segment.flightNumber)
    .filter((value): value is string => Boolean(value));

  const dateTimeMatches = [...normalizedText.matchAll(
    /\b([A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]+\s+\d{4},\s+\d{2}:\d{2})\b/gi
  )].map((match) => match[1]);

  const parsedDeparture = parseViaIndonesianDate(
    singleFlight?.departureDateLine ?? dateTimeMatches[0] ?? null
  );
  const parsedArrival = parseViaIndonesianDate(
    singleFlight?.arrivalDateLine ??
      dateTimeMatches[dateTimeMatches.length - 1] ??
      null
  );

  const durationMatches = [...normalizedText.matchAll(/\b(\d+j\s+\d+m)\b/gi)].map(
    (match) => match[1]
  );
  for (const segment of parsedSegments) {
    if (segment.duration) {
      durationMatches.push(segment.duration);
    }
  }
  const durationMinutes = durationMatches.reduce(
    (total, value) => total + (parseViaDurationToMinutes(value) ?? 0),
    0
  );
  const firstSegment = parsedSegments[0] ?? null;
  const lastSegment = parsedSegments[parsedSegments.length - 1] ?? null;
  const departureCity = formatViaCity(
    firstSegment?.departureCity ?? null,
    firstSegment?.departureCode ?? null
  );
  const arrivalCity = formatViaCity(
    lastSegment?.arrivalCity ?? null,
    lastSegment?.arrivalCode ?? null
  );

  const passengers = extractViaPassengersFromText(normalizedText);
  const cabinClass =
    normalizedText.match(/\b(Economy|Business|Premium Economy|First Class)\b/i)?.[1] ??
    normalizedText.match(/\bCabin Class\b\s+([A-Za-z ]+)/i)?.[1]?.trim() ??
    null;

  if (
    !pnr &&
    !ticketNumber &&
    airlines.length === 0 &&
    flightNumbers.length === 0 &&
    passengers.length === 0
  ) {
    return null;
  }

  return {
    provider: "VIA",
    pnr: isLikelyGarbageValue(pnr) ? null : pnr,
    ticketNumber: ticketNumber ?? pnr,
    airline: airlines.join(", ") || null,
    flightNumber: flightNumbers.join(", ") || null,
    cabinClass,
    departureCity,
    arrivalCity,
    departureAirport: departureCity,
    arrivalAirport: arrivalCity,
    departureTerminal: singleFlight?.departureTerminal ?? null,
    arrivalTerminal: singleFlight?.arrivalTerminal ?? null,
    departureDate: parsedDeparture?.date ?? null,
    arrivalDate: parsedArrival?.date ?? parsedDeparture?.date ?? null,
    departureTime: parsedDeparture?.time ?? null,
    arrivalTime: parsedArrival?.time ?? null,
    duration:
      computeDuration(
        parsedDeparture?.time ?? null,
        parsedArrival?.time ?? null
      ) ??
      (durationMinutes > 0 ? formatViaDuration(durationMinutes) : null),
    rawText: normalizedText,
    passengers,
    quantity: Math.max(passengers.length, 1),
  };
}

async function renderPdfPagesToImages(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");

  if (!("pdfjsWorker" in globalThis)) {
    Object.assign(globalThis, { pdfjsWorker });
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
    const pages: Buffer[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );
      const context = canvas.getContext("2d");

      await page.render({
        canvas: canvas as never,
        canvasContext: context as never,
        viewport,
      }).promise;

      pages.push(canvas.toBuffer("image/png"));
    }

    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

async function extractViaOcrText(buffer: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const renderedPages = await renderPdfPagesToImages(buffer);
  const worker = await createWorker("eng", 1, {
    workerPath: path.join(
      process.cwd(),
      "node_modules",
      "tesseract.js",
      "src",
      "worker-script",
      "node",
      "index.js"
    ),
  });

  try {
    const pageTexts: string[] = [];

    for (const renderedPage of renderedPages) {
      const result = await worker.recognize(renderedPage);
      const text = (result.data.text ?? "")
        .split(/\r?\n/)
        .map((line) => normalizeWhitespace(line))
        .filter(Boolean)
        .join("\n");
      if (text) {
        pageTexts.push(text);
      }
    }
    const rawText = pageTexts.join("\n\n");
    writeFileSync("/tmp/via-ocr.txt", rawText, "utf-8");
    return rawText;
  } finally {
    await worker.terminate();
  }
}

export async function mapViaWithOcr(
  buffer: Buffer
): Promise<PartialFlightTicketDraft | null> {
  const rawText = await extractViaOcrText(buffer);
  if (!rawText) {
    return null;
  }

  return (
    parseViaText(rawText) ?? {
      provider: "VIA",
      rawText,
      quantity: 1,
      passengers: [],
    }
  );
}
