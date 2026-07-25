import type { CreateFlightTicketDto } from "@/lib/dto/flight-ticket/create-flight-ticket.dto";
import {
  FLIGHT_TICKET_PROVIDERS,
  type FlightTicketProvider,
} from "@/lib/flight-ticket/providers";
import {
  groupItemsIntoLines,
  normalizeWhitespace,
  type PartialFlightTicketDraft,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";
import {
  mapTraveloka,
  mapTravelokaLoose,
} from "@/lib/flight-ticket/pdf-ticket-mappers/traveloka";
import { mapCueTravel } from "@/lib/flight-ticket/pdf-ticket-mappers/cue-travel";
import { mapCueTravelMulti } from "@/lib/flight-ticket/pdf-ticket-mappers/cue-travel-multi";
import { mapVia } from "@/lib/flight-ticket/pdf-ticket-mappers/via";
import { mapViaWithOcr } from "@/lib/flight-ticket/pdf-ticket-mappers/via-ocr";
import { mapGaruda } from "@/lib/flight-ticket/pdf-ticket-mappers/garuda";
import { mapCitilink } from "@/lib/flight-ticket/pdf-ticket-mappers/citilink";
import { mapLionAir } from "@/lib/flight-ticket/pdf-ticket-mappers/lion-air";
import { mapTrain } from "@/lib/flight-ticket/pdf-ticket-mappers/train";

const FLIGHT_TICKET_PROVIDER_VALUES = new Set<FlightTicketProvider>(
  FLIGHT_TICKET_PROVIDERS.map((provider) => provider.value)
);

function cleanText(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\u0000/g, "")
      .replace(/\s+-\s+/g, " - ")
  );
}

function isTextItem(
  item: unknown
): item is {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
} {
  return (
    !!item &&
    typeof item === "object" &&
    "str" in item &&
    "transform" in item &&
    Array.isArray((item as { transform: unknown }).transform)
  );
}

async function extractPdfTextItems(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

  if (!("pdfjsWorker" in globalThis)) {
    Object.assign(globalThis, { pdfjsWorker });
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const document = await loadingTask.promise;

  try {
    const items: PdfTextItem[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false,
      });

      for (const item of textContent.items) {
        if (!isTextItem(item)) {
          continue;
        }

        const text = cleanText(item.str);
        if (!text) {
          continue;
        }

        items.push({
          page: pageNumber,
          text,
          x: Number(item.transform[4] ?? 0),
          y: Number(item.transform[5] ?? 0),
          width: Number(item.width ?? 0),
          height: Number(item.height ?? 0),
        });
      }
    }

    return items;
  } finally {
    await loadingTask.destroy();
  }
}

export async function mapFlightTicketPdfToDraft(
  provider: string,
  buffer: Buffer,
  fallback: Pick<
    CreateFlightTicketDto,
    "originalFileName" | "objectKey" | "provider"
  >
) {
  const normalizedProvider = provider.trim().toUpperCase() as FlightTicketProvider;
  const resolvedProvider = FLIGHT_TICKET_PROVIDER_VALUES.has(normalizedProvider)
    ? normalizedProvider
    : "TRAVELOKA";

  const baseDraft: PartialFlightTicketDraft = {
    provider: resolvedProvider,
    originalFileName: fallback.originalFileName,
    objectKey: fallback.objectKey,
    rawText: null,
    passengers: [],
  };

  const isPdf =
    fallback.originalFileName.toLowerCase().endsWith(".pdf") &&
    buffer.byteLength > 0;
  if (!isPdf) {
    return baseDraft;
  }

  if (baseDraft.provider === "VIA") {
    try {
      const ocrMapped = await mapViaWithOcr(buffer);
      const ocrPassengerCount = ocrMapped?.passengers?.length ?? 0;
      if (
        ocrMapped &&
        (
          ocrMapped.pnr ||
          ocrMapped.ticketNumber ||
          ocrMapped.airline ||
          ocrMapped.departureAirport ||
          ocrPassengerCount > 0
        )
      ) {
        return {
          ...baseDraft,
          ...ocrMapped,
        };
      }
    } catch (error) {
      console.error("VIA OCR fallback failed.", error);
    }
  }

  try {
    const items = await extractPdfTextItems(buffer);
    const lines = groupItemsIntoLines(items);

    if (baseDraft.provider === "TRAVELOKA") {
      const mapped = mapTraveloka(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }

      return {
        ...baseDraft,
        ...mapTravelokaLoose(items),
      };
    }

    if (baseDraft.provider === "CUE_TRAVEL") {
      const multiMapped = mapCueTravelMulti(lines);
      const multiPassengerCount = multiMapped?.passengers?.length ?? 0;
      if (
        multiMapped &&
        (
          multiMapped.flightOptions?.length ?? 0
        ) > 1 &&
        (
          multiMapped.pnr ||
          multiMapped.ticketNumber ||
          multiMapped.airline ||
          multiMapped.departureAirport ||
          multiPassengerCount > 0
        )
      ) {
        return {
          ...baseDraft,
          ...multiMapped,
        };
      }

      const mapped = mapCueTravel(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    if (baseDraft.provider === "VIA") {
      const mapped = mapVia(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    if (baseDraft.provider === "GARUDA") {
      const mapped = mapGaruda(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    if (baseDraft.provider === "CITILINK") {
      const mapped = mapCitilink(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    if (baseDraft.provider === "LION_AIR") {
      const mapped = mapLionAir(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    if (baseDraft.provider === "TRAIN") {
      const mapped = mapTrain(lines);
      const passengerCount = mapped.passengers?.length ?? 0;
      if (
        mapped.pnr ||
        mapped.ticketNumber ||
        mapped.airline ||
        mapped.departureAirport ||
        passengerCount > 0
      ) {
        return {
          ...baseDraft,
          ...mapped,
        };
      }
    }

    return {
      ...baseDraft,
      rawText: lines.map((line) => line.text).join("\n"),
    };
  } catch {
    if (baseDraft.provider === "TRAVELOKA") {
      try {
        const items = await extractPdfTextItems(buffer);
        return {
          ...baseDraft,
          ...mapTravelokaLoose(items),
        };
      } catch {
        return baseDraft;
      }
    }

    return baseDraft;
  }
}
