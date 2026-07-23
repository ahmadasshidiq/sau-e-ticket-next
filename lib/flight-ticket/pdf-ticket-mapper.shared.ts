import type { CreateFlightTicketDto } from "@/lib/dto/flight-ticket/create-flight-ticket.dto";
import type { FlightTicketProvider } from "@/lib/flight-ticket/providers";

export type PdfTextItem = {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfLine = {
  page: number;
  y: number;
  items: PdfTextItem[];
  text: string;
};

export type PartialFlightTicketDraft = Partial<CreateFlightTicketDto> & {
  provider: FlightTicketProvider;
  quantity?: number;
};

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function groupItemsIntoLines(items: PdfTextItem[]) {
  const sorted = [...items].sort((left, right) => {
    if (left.page !== right.page) return left.page - right.page;
    if (Math.abs(left.y - right.y) > 2) return right.y - left.y;
    return left.x - right.x;
  });

  const lines: PdfLine[] = [];

  for (const item of sorted) {
    const lastLine = lines.at(-1);
    if (
      lastLine &&
      lastLine.page === item.page &&
      Math.abs(lastLine.y - item.y) <= Math.max(3, item.height * 0.4)
    ) {
      lastLine.items.push(item);
      continue;
    }

    lines.push({
      page: item.page,
      y: item.y,
      items: [item],
      text: "",
    });
  }

  for (const line of lines) {
    line.items.sort((left, right) => left.x - right.x);
    line.text = normalizeWhitespace(line.items.map((item) => item.text).join(" "));
  }

  return lines;
}

export function findFirstLine(lines: PdfLine[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line.text))?.text ?? null;
}

export function flattenItems(lines: PdfLine[]) {
  return lines.flatMap((line) => line.items);
}

export function findItem(
  items: PdfTextItem[],
  pattern: RegExp,
  predicate?: (item: PdfTextItem) => boolean
) {
  return (
    items.find((item) => pattern.test(item.text) && (!predicate || predicate(item))) ??
    null
  );
}

export function findValueBelowLabel(
  items: PdfTextItem[],
  labelPattern: RegExp,
  options?: {
    samePage?: boolean;
    minYOffset?: number;
    maxYOffset?: number;
    minXOffset?: number;
    maxXOffset?: number;
    valuePattern?: RegExp;
  }
) {
  const label = findItem(items, labelPattern);
  if (!label) {
    return null;
  }

  const {
    samePage = true,
    minYOffset = 6,
    maxYOffset = 28,
    minXOffset = -8,
    maxXOffset = 120,
    valuePattern,
  } = options ?? {};

  return (
    items.find((item) => {
      if (samePage && item.page !== label.page) {
        return false;
      }

      const deltaY = label.y - item.y;
      const deltaX = item.x - label.x;

      return (
        deltaY >= minYOffset &&
        deltaY <= maxYOffset &&
        deltaX >= minXOffset &&
        deltaX <= maxXOffset &&
        (!valuePattern || valuePattern.test(item.text))
      );
    }) ?? null
  );
}

export function parseDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i
  );

  if (!match) {
    return null;
  }

  const [, day, monthLabel, year] = match;
  const monthMap: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const month = monthMap[monthLabel.toLowerCase()];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

export function computeDuration(
  departureTime: string | null,
  arrivalTime: string | null
) {
  if (!departureTime || !arrivalTime) {
    return null;
  }

  const departureMatch = departureTime.match(/^(\d{2}):(\d{2})$/);
  const arrivalMatch = arrivalTime.match(/^(\d{2}):(\d{2})$/);
  if (!departureMatch || !arrivalMatch) {
    return null;
  }

  const departureMinutes =
    Number(departureMatch[1]) * 60 + Number(departureMatch[2]);
  const arrivalMinutes = Number(arrivalMatch[1]) * 60 + Number(arrivalMatch[2]);
  const totalMinutes =
    arrivalMinutes >= departureMinutes
      ? arrivalMinutes - departureMinutes
      : arrivalMinutes + 24 * 60 - departureMinutes;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} Hour ${minutes} Minutes`;
}

export function parseAirportLabel(cityLine: string | null, detailLine: string | null) {
  if (!cityLine) {
    return {
      airport: null,
      terminal: null,
    };
  }

  const cityMatch = cityLine.match(/^(.+?)\s+\(([A-Z]{3})\)$/);
  const city = normalizeWhitespace(cityMatch?.[1] ?? cityLine);
  const code = cityMatch?.[2] ?? "";
  const detail = normalizeWhitespace(detailLine ?? "");

  const [airportNamePart, ...terminalParts] = detail.split(/\s+-\s+/);
  const airportName = normalizeWhitespace(airportNamePart);
  const terminal = terminalParts.length
    ? normalizeWhitespace(terminalParts.join(" - "))
    : null;

  const airport = normalizeWhitespace(airportName || city);

  return {
    airport: airport || null,
    terminal,
  };
}
