import type { PassengerDto } from "@/lib/dto/flight-ticket/passenger.dto";
import {
  computeDuration,
  findFirstLine,
  findItem,
  findValueBelowLabel,
  flattenItems,
  normalizeWhitespace,
  parseAirportLabel,
  parseDateLabel,
  type PartialFlightTicketDraft,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/flight-ticket/pdf-ticket-mapper.shared";

function extractTravelokaTicketNumber(lines: PdfLine[]) {
  const line = flattenItems(lines).find((entry) =>
    /^\d{10,16}(?:\/\d{2})?$/.test(entry.text.replace(/\s+/g, ""))
  );

  return line?.text.replace(/\s+/g, "") ?? null;
}

function extractTravelokaPassengers(items: PdfTextItem[]) {
  const passengerHeader = findItem(items, /Passenger Details/i);
  if (!passengerHeader) {
    return [];
  }

  const tableItems = items
    .filter(
      (item) =>
        item.page === passengerHeader.page &&
        item.y < passengerHeader.y - 20 &&
        item.y > passengerHeader.y - 180
    )
    .sort((left, right) => {
      if (Math.abs(left.y - right.y) > 2) {
        return right.y - left.y;
      }
      return left.x - right.x;
    });

  const rowMarkers = tableItems
    .filter((item) => /^\d+\s*\.$/.test(item.text))
    .sort((left, right) => right.y - left.y);

  const passengers: PassengerDto[] = [];

  for (let index = 0; index < rowMarkers.length; index += 1) {
    const marker = rowMarkers[index];
    const nextMarkerY = rowMarkers[index + 1]?.y ?? -Infinity;
    const rowItems = tableItems.filter(
      (item) => item.y <= marker.y + 3 && item.y > nextMarkerY + 3
    );

    const nameItems = rowItems
      .filter((item) => item.x >= 50 && item.x < 180)
      .sort((left, right) => right.y - left.y)
      .map((item) => item.text);
    const facilitiesItems = rowItems
      .filter((item) => item.x >= 293 && item.x < 430)
      .sort((left, right) => right.y - left.y)
      .map((item) => item.text);
    const ticketItem =
      rowItems.find(
        (item) =>
          item.x >= 470 &&
          item.x < 560 &&
          /^\d{10,16}(?:\/\d{2})?$/.test(item.text.replace(/\s+/g, ""))
      ) ?? null;
    const genderTypeText =
      rowItems.find(
        (item) =>
          item.x >= 50 &&
          item.x < 180 &&
          /^\((Male|Female|Laki-laki|Perempuan|)\)\s+\((Adult|Child|Infant|Dewasa|Anak|Bayi)\)$/i.test(
            item.text
          )
      )?.text ?? null;

    const rawPassengerType =
      genderTypeText?.match(/\((Adult|Child|Infant|Dewasa|Anak|Bayi)\)/i)?.[1] ?? null;
    const passengerType =
      rawPassengerType?.toLowerCase() === "adult" ||
      rawPassengerType?.toLowerCase() === "dewasa"
        ? "Adult"
        : rawPassengerType?.toLowerCase() === "child" ||
            rawPassengerType?.toLowerCase() === "anak"
          ? "Child"
          : rawPassengerType?.toLowerCase() === "infant" ||
              rawPassengerType?.toLowerCase() === "bayi"
            ? "Infant"
            : null;
    const gender =
      genderTypeText?.match(/\((Male|Female|Laki-laki|Perempuan)\)/i)?.[1]?.toLowerCase() ??
      null;

    const name = normalizeWhitespace(
      nameItems
        .filter(
          (text) =>
            !/^\((Male|Female|Laki-laki|Perempuan)\)\s+\((Adult|Child|Infant|Dewasa|Anak|Bayi)\)$/i.test(
              text
            )
        )
        .join(" ")
    );
    const baggage =
      facilitiesItems.find((text) => /^\d+\s*KG\s+Baggage$/i.test(text)) ?? null;

    if (!name) {
      continue;
    }

    passengers.push({
      title:
        gender === "male" || gender === "laki-laki"
          ? "Mr."
          : gender === "female" || gender === "perempuan"
            ? "Ms."
            : null,
      name,
      passengerType,
      baggage,
      ticketNumber: ticketItem?.text.replace(/\s+/g, "") ?? null,
    });
  }

  return passengers;
}

export function mapTravelokaLoose(items: PdfTextItem[]): PartialFlightTicketDraft {
  const rawLines = items.map((item) => item.text).filter(Boolean);
  const rawText = rawLines.join("\n");
  const timeLines = rawLines.filter((line) => /^\d{2}:\d{2}$/.test(line));
  const dates = rawLines.filter((line) =>
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}/i.test(
      line
    )
  );
  const airportIndex = rawLines.findIndex((line) => /^\d{2}:\d{2}$/.test(line));
  const departureAirport = rawLines[airportIndex + 1] ?? null;
  const departureTerminal = rawLines[airportIndex + 2] ?? null;
  const arrivalAirport = rawLines[airportIndex + 4] ?? null;
  const arrivalTerminal = rawLines[airportIndex + 5] ?? null;
  const departureCity =
    departureAirport?.match(/^(.+?)\s+\([A-Z]{3}\)$/)?.[1] ?? departureAirport ?? null;
  const arrivalCity =
    arrivalAirport?.match(/^(.+?)\s+\([A-Z]{3}\)$/)?.[1] ?? arrivalAirport ?? null;
  const pnrIndex = rawLines.findIndex((line) =>
    line.includes("Airline Booking Code (PNR)")
  );
  const pnr = pnrIndex >= 0 ? rawLines[pnrIndex + 1] ?? null : null;
  const bookingIdIndex = rawLines.findIndex((line) =>
    line.includes("Traveloka Booking ID")
  );
  const bookingId = bookingIdIndex >= 0 ? rawLines[bookingIdIndex + 1] ?? null : null;
  const airline = rawLines.find((line) =>
    /^(Citilink|Garuda Indonesia|Batik Air|Lion Air|Super Air Jet|AirAsia)$/i.test(line)
  ) ?? null;
  const cabinClass = rawLines.find((line) =>
    /^(Economy|Business|Premium Economy|First Class)$/i.test(line)
  ) ?? null;
  const passengers = extractTravelokaPassengers(items);

  return {
    provider: "TRAVELOKA",
    pnr,
    ticketNumber: bookingId,
    airline,
    cabinClass,
    departureCity,
    arrivalCity,
    departureAirport,
    arrivalAirport,
    departureTerminal,
    arrivalTerminal,
    departureDate: parseDateLabel(dates[0] ?? null),
    arrivalDate: parseDateLabel(dates[0] ?? null),
    departureTime: timeLines[0] ?? null,
    arrivalTime: timeLines[1] ?? null,
    duration: computeDuration(timeLines[0] ?? null, timeLines[1] ?? null),
    quantity: Math.max(passengers.length, 1),
    rawText,
    passengers,
    farePerPax: null,
    grandTotal: null,
  };
}

export function mapTraveloka(lines: PdfLine[]): PartialFlightTicketDraft {
  const items = flattenItems(lines);
  const rawText = lines.map((line) => line.text).join("\n");
  const dateLine = findFirstLine(
    lines,
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/
  );
  const headerItems = items.filter(
    (item) => item.page === 1 && item.y >= 640 && item.y <= 760
  );
  const timeItems = headerItems
    .filter((item) => /^\d{2}:\d{2}$/.test(item.text))
    .sort((left, right) => right.y - left.y);
  const departureTimeItem = timeItems[0] ?? null;
  const arrivalTimeItem = timeItems[1] ?? null;
  const departureTime = departureTimeItem?.text ?? null;
  const arrivalTime = arrivalTimeItem?.text ?? null;

  const cityItems = headerItems
    .filter(
      (item) =>
        /^[A-Za-z .'-]+\s+\([A-Z]{3}\)$/.test(item.text) &&
        item.x >= 150 &&
        item.x <= 320
    )
    .sort((left, right) => right.y - left.y);
  const departureCityItem = cityItems[0] ?? null;
  const arrivalCityItem =
    cityItems.find((item) => item.text !== departureCityItem?.text) ?? null;

  const departureDetailItem =
    (departureCityItem &&
      headerItems.find(
        (item) =>
          item.page === departureCityItem.page &&
          item.x >= departureCityItem.x - 2 &&
          item.x <= departureCityItem.x + 6 &&
          item.y < departureCityItem.y &&
          item.y >= departureCityItem.y - 18 &&
          !/^\d{2}:\d{2}$/.test(item.text)
      )) ??
    null;
  const arrivalDetailItem =
    (arrivalCityItem &&
      headerItems.find(
        (item) =>
          item.page === arrivalCityItem.page &&
          item.x >= arrivalCityItem.x - 2 &&
          item.x <= arrivalCityItem.x + 6 &&
          item.y < arrivalCityItem.y &&
          item.y >= arrivalCityItem.y - 18 &&
          !/^\d{2}:\d{2}$/.test(item.text)
      )) ??
    null;

  const departureParsed = parseAirportLabel(
    departureCityItem?.text ?? null,
    departureDetailItem?.text ?? null
  );
  const arrivalParsed = parseAirportLabel(
    arrivalCityItem?.text ?? null,
    arrivalDetailItem?.text ?? null
  );

  const airlineItem =
    findItem(items, /^(Citilink|Garuda Indonesia|Batik Air|Lion Air|Super Air Jet|AirAsia)$/i) ??
    findItem(
      items,
      /^(Citilink|Garuda Indonesia|Batik Air|Lion Air|Super Air Jet|AirAsia)\s+\d{2}:\d{2}/i
    );
  const airline =
    airlineItem?.text.match(
      /^(Citilink|Garuda Indonesia|Batik Air|Lion Air|Super Air Jet|AirAsia)/i
    )?.[1] ?? null;
  const cabinClassItem =
    findItem(headerItems, /^(Economy|Business|Premium Economy|First Class)$/i) ?? null;
  const flightNumberItem =
    (airlineItem &&
      cabinClassItem &&
      headerItems.find(
        (item) =>
          item.page === airlineItem.page &&
          item.x >= airlineItem.x - 12 &&
          item.x <= airlineItem.x + 90 &&
          item.y < airlineItem.y &&
          item.y > cabinClassItem.y &&
          /^[A-Z]{2}\s*-\s*\d{2,4}$/i.test(item.text)
      )) ??
    headerItems.find((item) => /^[A-Z]{2}\s*-\s*\d{2,4}$/i.test(item.text)) ??
    headerItems.find((item) => /^[A-Z]{2}\d{2,4}$/i.test(item.text)) ??
    null;
  const flightNumber = flightNumberItem?.text ?? null;
  const cabinClass = cabinClassItem?.text ?? null;
  const pnr =
    findValueBelowLabel(items, /Airline Booking Code \(PNR\)/i, {
      valuePattern: /^[A-Z0-9]{6}$/i,
    })?.text ?? null;
  const bookingId =
    findValueBelowLabel(items, /Traveloka Booking ID/i, {
      valuePattern: /^\d{8,16}$/,
    })?.text ?? null;
  const checkInCode =
    findValueBelowLabel(items, /Flight Check-in Code/i, {
      valuePattern: /^[A-Z0-9]{6,10}$/i,
    })?.text ?? null;
  const passengers = extractTravelokaPassengers(items);
  const ticketNumber = bookingId ?? extractTravelokaTicketNumber(lines) ?? null;

  return {
    provider: "TRAVELOKA",
    pnr,
    ticketNumber,
    airline,
    flightNumber,
    cabinClass,
    departureCity: departureCityItem?.text ?? null,
    arrivalCity: arrivalCityItem?.text ?? null,
    departureAirport: departureParsed.airport,
    arrivalAirport: arrivalParsed.airport,
    departureTerminal: departureParsed.terminal,
    arrivalTerminal: arrivalParsed.terminal,
    departureGate: checkInCode,
    departureDate: parseDateLabel(dateLine),
    arrivalDate: parseDateLabel(dateLine),
    departureTime,
    arrivalTime,
    duration: computeDuration(departureTime, arrivalTime),
    quantity: Math.max(passengers.length, 1),
    rawText,
    passengers,
    farePerPax: null,
    grandTotal: null,
  };
}
