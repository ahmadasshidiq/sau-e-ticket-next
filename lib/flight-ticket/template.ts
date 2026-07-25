import {
  Airplane02Icon,
  Bus01Icon,
  InformationCircleIcon,
  Train01Icon,
} from "@hugeicons/core-free-icons";

import { getFlightTicketProviderMeta } from "@/lib/flight-ticket/providers";

type PassengerLike = {
  title?: string | null;
  name: string;
  passengerType?: string | null;
  baggage?: string | null;
  ticketNumber?: string | null;
};

type FlightTicketLike = {
  pnr?: string | null;
  ticketNumber?: string | null;
  bookingReference?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  departureCity?: string | null;
  arrivalCity?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTerminal?: string | null;
  departureDate?: Date | string | null;
  arrivalDate?: Date | string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  duration?: string | null;
  serviceMode?: string | null;
  farePerPax?: string | null;
  grandTotal?: string | number | null;
  provider?: string | null;
  passengers?: PassengerLike[];
};

const PROVIDER_LOGO_SRC = "/img/logo-warna.png";

type HugeIconNode = readonly [string, Readonly<Record<string, string | number>>];

function sanitize(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : "-";
}

function escapeHtml(value: string | null | undefined) {
  return sanitize(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractTime(value: string | null | undefined) {
  const text = sanitize(value);
  const match = text.match(/(\d{2}:\d{2})/);
  return match?.[1] ?? text;
}

function formatDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    options ?? { day: "2-digit", month: "long", year: "numeric" }
  ).format(date);
}

function formatDayName(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const normalized = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(normalized)) {
    return String(value);
  }

  return `IDR ${new Intl.NumberFormat("id-ID").format(normalized)}`;
}

function parseDuration(duration: string | null | undefined) {
  const text = sanitize(duration);
  const hoursMatch = text.match(/(\d+)\s*(?:Hour|Jam|Hrs?)/i);
  const minutesMatch = text.match(/(\d+)\s*(?:Minute|Menit|Mins?)/i);

  if (!hoursMatch && !minutesMatch) {
    return {
      primary: text,
      secondary: text,
    };
  }

  const hours = hoursMatch?.[1] ?? "0";
  const minutes = minutesMatch?.[1] ?? "0";

  return {
    primary: `${hours} Hour ${minutes} Minutes`,
    secondary: `${hours} Jam ${minutes} Menit`,
  };
}

function splitAirport(value: string | null | undefined) {
  const text = sanitize(value);
  const match = text.match(/^(.*?)(?:\s*\(([A-Z]{3})\))?$/);

  return {
    city: match?.[1]?.trim() || text,
    code: match?.[2] || "",
  };
}

function formatAirportDisplay(value: string | null | undefined) {
  const airport = splitAirport(value);
  const city = airport.city;
  const code = airport.code;

  const patterns = [
    {
      match: /^Batam\s+Hang\s+Nadim(?:\s+Airport)?$/i,
      title: "BATAM",
      detail: "HANG NADIM",
    },
    {
      match: /^Jakarta\s+Soekarno(?:-|\s)Hatta\s+International(?:\s+Airport)?$/i,
      title: "JAKARTA",
      detail: "SOEKARNO HATTA INTERNATIONAL",
    },
    {
      match: /^JAKARTA\s+SOEKARNO\s+HATTA\s+INTL$/i,
      title: "JAKARTA",
      detail: "SOEKARNO HATTA INTL",
    },
    {
      match: /^DENPASAR-BALI\s+NGURAH\s+RAI$/i,
      title: "DENPASAR-BALI",
      detail: "NGURAH RAI",
    },
    {
      match: /^Balikpapan\s+Sultan\s+Aji\s+Muhammad\s+Sulaiman$/i,
      title: "Balikpapan",
      detail: "SULTAN AJI MUHAMMAD SULAIMAN",
    },
    {
      match: /^Jakarta\s+Soekarno-Hatta\s+International$/i,
      title: "Jakarta",
      detail: "SOEKARNO HATTA INTERNATIONAL",
    },
  ];

  for (const pattern of patterns) {
    if (pattern.match.test(city)) {
      return {
        title: pattern.title,
        code,
        detail: pattern.detail,
      };
    }
  }

  return {
    title: city,
    code,
    detail: city,
  };
}

function renderAirlineBrandMarkup(airline: string | null | undefined) {
  const airlineName = sanitize(airline);
  const normalized = airlineName.toLowerCase();

  const logoSrc = normalized.includes("batik")
    ? "/img/maskapai-batik-air.png"
    : normalized.includes("lion air")
      ? "/img/maskapai-lion-air.png"
      : normalized.includes("pelita")
        ? "/img/maskapai-pelita-air.png"
        : normalized.includes("garuda")
          ? "/img/maskapai-garuda.png"
          : normalized.includes("citilink")
            ? "/img/maskapai-citilink.png"
            : normalized.includes("super air jet")
              ? "/img/maskapai-super-air-jet.png"
              : normalized.includes("airasia") || normalized.includes("air asia")
                ? "/img/maskapai-air-asia.png"
                : normalized.includes("wings air")
                  ? "/img/maskapai-wings-air.png"
                  : normalized.includes("transnusa") || normalized.includes("trans nusa")
                    ? "/img/maskapai-trans-nusa.png"
                    : normalized === "kai" || normalized.includes("kereta api indonesia")
                      ? "/img/maskapai-kai.png"
                      : null;

  if (!logoSrc) {
    return `<span class="airline-logo-text">${escapeHtml(airlineName)}</span>`;
  }

  return `<img src="${logoSrc}" alt="${escapeHtml(airlineName)}" class="airline-logo-image" />`;
}

function getAirlineLogoSrc(airline: string | null | undefined) {
  const airlineName = sanitize(airline);
  const normalized = airlineName.toLowerCase();

  return normalized.includes("batik")
    ? "/img/maskapai-batik-air.png"
    : normalized.includes("lion air")
      ? "/img/maskapai-lion-air.png"
      : normalized.includes("pelita")
        ? "/img/maskapai-pelita-air.png"
        : normalized.includes("garuda")
          ? "/img/maskapai-garuda.png"
          : normalized.includes("citilink")
            ? "/img/maskapai-citilink.png"
            : normalized.includes("super air jet")
              ? "/img/maskapai-super-air-jet.png"
              : normalized.includes("airasia") || normalized.includes("air asia")
                ? "/img/maskapai-air-asia.png"
                : normalized.includes("wings air")
                  ? "/img/maskapai-wings-air.png"
                  : normalized.includes("transnusa") || normalized.includes("trans nusa")
                    ? "/img/maskapai-trans-nusa.png"
                    : normalized === "kai" || normalized.includes("kereta api indonesia")
                      ? "/img/maskapai-kai.png"
                      : null;
}

function renderHugeIconMarkup(icon: readonly HugeIconNode[], size = 12) {
  const children = icon
    .map(([tag, attributes]) => {
      const props = Object.entries(attributes)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
        .join(" ");

      return `<${tag} ${props}></${tag}>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${children}</svg>`;
}

function renderServiceModeIcon(serviceMode: string | null | undefined) {
  const normalized = sanitize(serviceMode).toLowerCase();

  if (normalized === "train") {
    return renderHugeIconMarkup(Train01Icon, 16);
  }

  if (normalized === "bus") {
    return renderHugeIconMarkup(Bus01Icon, 16);
  }

  return renderHugeIconMarkup(Airplane02Icon, 16);
}

export function renderFlightTicketHtml(ticket: FlightTicketLike) {
  const provider = getFlightTicketProviderMeta(ticket.provider);
  const passengers = ticket.passengers ?? [];
  const departureDisplay = formatAirportDisplay(ticket.departureAirport);
  const arrivalDisplay = formatAirportDisplay(ticket.arrivalAirport);
  const departureCityDisplay = splitAirport(ticket.departureCity);
  const arrivalCityDisplay = splitAirport(ticket.arrivalCity);
  const duration = parseDuration(ticket.duration);
  const departureDate = formatDate(ticket.departureDate, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const arrivalDate = formatDate(ticket.arrivalDate, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const departureDay = formatDayName(ticket.departureDate);
  const arrivalDay = formatDayName(ticket.arrivalDate);
  const departureTime = extractTime(ticket.departureTime);
  const arrivalTime = extractTime(ticket.arrivalTime);
  const providerLogoSrc = PROVIDER_LOGO_SRC;
  const referenceNumber = ticket.bookingReference;
  const infoIcon = renderHugeIconMarkup(InformationCircleIcon);
  const transportIcon = renderServiceModeIcon(ticket.serviceMode);
  const airlineBrandMarkup = renderAirlineBrandMarkup(ticket.airline);
  const airlineLogoSrc = getAirlineLogoSrc(ticket.airline);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(provider.templateName)}</title>
    <link rel="preload" as="image" href="${providerLogoSrc}" fetchpriority="high" />
    ${airlineLogoSrc ? `<link rel="preload" as="image" href="${airlineLogoSrc}" fetchpriority="high" />` : ""}
    <style>
        @page {
            size: A4;
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        :root {
            --brand-blue-dark: #004383;
            --brand-blue: #0058A3;
            --brand-blue-gradient: linear-gradient(135deg, #004383 0%, #0058A3 100%);
            --brand-blue-soft: #0058A3;
            --brand-blue-softest: #eaf4ff;
        }

        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            background: #ffffff;
        }

        .sheet {
            width: 794px;
            min-height: 1123px;
            padding: 18px 12px;
            background: #ffffff;
        }

        .ticket {
            width: 100%;
            min-height: 1080px;
            border: 1px solid #d7e3f1;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
        }

        .top-strip {
            height: 8px;
            background: var(--brand-blue-gradient);
        }

        .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 18px 18px 12px;
        }

        .provider {
            flex: 1;
        }

        .provider-title {
            display: flex;
            align-items: center;
            min-height: 48px;
        }

        .provider-logo {
            display: block;
            width: auto;
            max-width: 260px;
            height: 44px;
            object-fit: contain;
        }

        .provider-brand-fallback {
            color: var(--brand-blue);
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.04em;
        }

        .provider-copy {
            margin-top: 22px;
            color: #7f8b99;
            font-size: 12px;
            line-height: 1.5;
        }

        .provider-copy strong {
            display: block;
            color: #1f2937;
            font-size: 14px;
            margin: 6px 0 4px;
        }

        .provider-copy .label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #7f8b99;
            text-transform: uppercase;
        }

        .pnr-box-wrap {
            width: 250px;
            text-align: right;
        }

        .pnr-box-wrap h3 {
            margin: 0;
            font-size: 14px;
        }

        .pnr-box-wrap p {
            margin: 3px 0 12px;
            color: #8d93a1;
            font-size: 10px;
            display: none;
        }

        .pnr-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 0.5rem;
            width: 164px;
            height: 48px;
            background: var(--brand-blue-gradient);
            color: #fff;
            font-size: 28px;
            font-weight: 800;
        }

        .divider {
            height: 1px;
            margin: 0 18px;
            background: #dce5f2;
        }

        .ticket-label {
            padding: 20px 18px 16px;
            font-size: 16px;
        }

        .ticket-label .blue {
            color: var(--brand-blue);
            font-weight: 700;
        }

        .section-banner {
            background: var(--brand-blue-gradient);
            color: #fff;
            padding: 14px 18px 10px;
        }

        .section-banner .title {
            font-size: 18px;
            font-weight: 700;
        }

        .section-banner .subtitle {
            margin-top: 4px;
            font-size: 13px;
            font-style: italic;
        }

        .flight-block {
            padding: 22px 18px 14px;
        }

        .flight-top {
            display: grid;
            grid-template-columns: 190px 1fr 190px;
            gap: 12px;
            align-items: end;
        }

        .airline {
            color: #d9292e;
            font-size: 14px;
            font-style: italic;
            font-weight: 700;
        }

        .flight-number {
            margin-top: 8px;
            font-size: 14px;
            font-weight: 700;
        }

        .cabin {
            margin-top: 6px;
            color: #7e8795;
            font-size: 12px;
        }

        .date-time {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .day {
            color: #9ba5b3;
            font-size: 12px;
        }

        .date {
            color: var(--brand-blue);
            font-size: 14px;
            font-weight: 700;
        }

        .time {
            color: #111827;
            font-size: 24px;
            font-weight: 800;
            line-height: 1;
        }

        .date-time.arrival {
            text-align: right;
        }

        .timeline {
            display: grid;
            grid-template-columns: 190px 1fr 190px;
            gap: 12px;
            align-items: start;
            margin-top: 2px;
        }

        .timeline-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .route-line {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            width: 100%;
            margin: 14px 0 10px;
        }

        .route-line .circle {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            border: 2px solid var(--brand-blue);
            background: #fff;
        }

        .route-line .circle.solid {
            background: var(--brand-blue);
        }

        .route-line .line {
            width: 190px;
            height: 2px;
            background: var(--brand-blue-gradient);
        }

        .duration {
            text-align: center;
            width: 100%;
            margin-top: 0;
        }

        .duration strong {
            display: block;
            font-size: 11px;
        }

        .duration span {
            color: #9099a8;
            font-size: 10px;
            display: none;
        }

        .airports {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding-top: 10px;
        }

        .airport.right {
            text-align: right;
        }

        .airport .main {
            font-size: 14px;
            font-weight: 800;
        }

        .airport .sub {
            margin-top: 6px;
            color: #8b93a0;
            font-size: 11px;
        }

        .airport .meta {
            margin-top: 8px;
            color: #8b93a0;
            font-size: 11px;
        }

        .passenger-section {
            margin-top: 18px;
        }

        table {
            width: calc(100% - 36px);
            margin: 18px;
            border-collapse: collapse;
        }

        thead th {
            padding: 0 0 8px;
            border-bottom: 1px solid #dce5f2;
            color: #8d97a6;
            font-size: 14px;
            text-align: left;
        }

        thead th .sub {
            display: block;
            margin-top: 4px;
            color: #adb4bf;
            font-size: 11px;
            font-style: italic;
            font-weight: 400;
        }

        tbody td {
            padding: 16px 0;
            border-bottom: 1px solid #dce5f2;
            font-size: 14px;
            vertical-align: top;
        }

        tbody td:nth-child(2) {
            width: 36%;
            padding-right: 16px;
            word-break: break-word;
        }

        tbody td:nth-child(3) {
            width: 22%;
            padding-right: 16px;
            word-break: break-word;
        }

        tbody td:nth-child(4) {
            width: 16%;
            padding-right: 12px;
        }

        tbody td:nth-child(5) {
            width: 12%;
        }

        .fare-title {
            margin: 22px 18px 10px;
            font-size: 18px;
        }

        .fare-title .blue {
            color: var(--brand-blue);
            font-weight: 700;
        }

        .fare-box {
            margin: 0 18px 18px;
        }

        .fare-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px 20px 14px;
            background: var(--brand-blue-softest);
        }

        .fare-row+.fare-row {
            margin-top: 1px;
            background: #f5f9ff;
        }

        .fare-row .left strong {
            display: block;
            font-size: 16px;
        }

        .fare-row .left span {
            color: #8b93a0;
            font-size: 12px;
            font-style: italic;
        }

        .fare-row .right {
            font-size: 16px;
            font-weight: 700;
        }

        .fare-row.total .right {
            font-size: 16px;
            color: #111827;
        }

        .footer-notes {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin: 18px;
            padding: 12px 0 0;
            border-top: 1px solid #dce5f2;
        }

        .footer-note {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            color: #5b6472;
            font-size: 11px;
            line-height: 1.4;
        }

        .footer-note .icon {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: var(--brand-blue-softest);
            color: var(--brand-blue);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            flex: none;
            margin-top: 1px;
        }

        .footer-note .icon svg {
            width: 12px;
            height: 12px;
            display: block;
        }

        .body {
            display: flex;
            align-items: center;
            padding: 30px 20px;
            gap: 12px;
        }

        .airline {
            width: 120px;
            text-align: center;
            flex-shrink: 0;
        }

        .airline .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 36px;
            margin-bottom: 8px;
        }

        .airline-logo-image {
            display: block;
            max-width: 112px;
            max-height: 30px;
            width: auto;
            height: auto;
            object-fit: contain;
        }

        .airline-logo-text {
            color: #0f172a;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.15;
        }

        .airline .flight-id {
            font-weight: 700;
            font-size: 13px;
            color: #222;
        }

        .airline .flight-class {
            font-size: 12px;
            color: #555;
            margin-top: 2px;
        }

        .route {
            flex: 1;
            display: grid;
            grid-template-columns: minmax(0, 170px) 1fr minmax(0, 170px);
            align-items: start;
        }

        .stop {
            width: 170px;
            min-width: 0;
        }

        .stop.arrival {
            text-align: right;
        }

        .stop .day {
            font-size: 13px;
            color: var(--brand-blue);
            font-weight: 700;
        }

        .stop .day-id {
            font-size: 12px;
            color: #777;
            font-weight: 400;
        }

        .stop .date {
            font-size: 20px;
            color: var(--brand-blue);
            font-weight: 700;
            margin-bottom: 6px;
        }

        .stop .time {
            font-size: 20px;
            font-weight: 700;
            color: #111;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stop.arrival .time {
            justify-content: flex-end;
        }

        .stop .airport {
            font-size: 15px;
            font-weight: 700;
            color: #222;
            margin-top: 6px;
        }

        .stop .airport-full {
            font-size: 13px;
            color: #888;
            margin-top: 2px;
        }

        .stop .terminal {
            font-size: 13px;
            color: #888;
            margin-top: 2px;
        }

        .duration {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            margin-top: 32px;
            width: 100% !important;
            gap: 8px;
        }

        .duration .label {
            text-align: center;
        }

        .duration .label .en {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }

        .duration .track {
            display: flex;
            align-items: center;
            width: 100%;
            gap: 0;
        }

        .duration .dot {
            width: 12px !important;
            height: 12px !important;
            border-radius: 50% !important;
            flex: none !important;
            display: block !important;
            position: relative;
            z-index: 1;
        }

        .duration .dot.start {
            background: #fff !important;
            border: 2px solid var(--brand-blue) !important;
        }

        .duration .dot.end {
            background: var(--brand-blue) !important;
            border: none !important;
        }

        .duration .line-seg {
            flex: 1 !important;
            height: 2px !important;
            background: var(--brand-blue-gradient) !important;
            display: block !important;
            margin: 0 -1px;
        }

        .duration .plane {
            flex: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--brand-blue);
            line-height: 1;
            margin: 0 12px;
        }
    </style>
</head>

<body>
    <div class="sheet">
        <div class="ticket">
            <div class="top-strip"></div>

            <div class="header">
                <div class="provider">
                    <div class="provider-title">
                        <img
                            src="${providerLogoSrc}"
                            alt="SAU"
                            class="provider-logo"
                        />
                    </div>
                    <div class="provider-copy">
                        <div class="label">Reference Number</div>
                        <strong>${escapeHtml(referenceNumber)}</strong>
                    </div>
                </div>

                <div class="pnr-box-wrap">
                    <h3>Airline Booking Code (PNR)</h3>
                    <div class="pnr-box">${escapeHtml(ticket.pnr)}</div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="ticket-label">
                <span class="blue">E-ticket</span>
            </div>

            <div class="divider"></div>

            <div class="section-banner">
                <div class="title">Departure Flight - ${escapeHtml(
                    departureDay
                    )}, ${escapeHtml(departureDate)}</div>
            </div>

            <div class="body">
                <div class="airline">
                    <div class="logo">${airlineBrandMarkup}</div>
                    <div class="flight-id">${escapeHtml(ticket.flightNumber)}</div>
                    <div class="flight-class">Class: ${escapeHtml(ticket.cabinClass)}</div>
                </div>

                <div class="route">
                    <div class="stop departure">
                        <div style="line-height:1.3;">
                            <div style="font-size:13px; color:${"var(--brand-blue)"}; font-weight:700;">${escapeHtml(departureDay)}</div>
                            <div style="font-size:16px; color:${"var(--brand-blue)"}; font-weight:700; margin-top:2px;">${escapeHtml(departureDate)}</div>
                        </div>
                        <div class="time" style="justify-content:flex-start; margin-top:4px;">${escapeHtml(departureTime)}</div>
                        <div class="airport">${escapeHtml(departureCityDisplay.city.toUpperCase())}${
                            departureCityDisplay.code ? ` (${escapeHtml(departureCityDisplay.code.toUpperCase())})` : ""
                        }</div>
                        <div class="airport-full">
                          ${(() => {
                            const detail = escapeHtml(departureDisplay.detail).trim();
                            return /airport$/i.test(detail)
                              ? detail.toUpperCase()
                              : `${detail.toUpperCase()} AIRPORT`;
                          })()}
                        </div>
                        <div class="terminal">
                          ${(() => {
                            const terminal = escapeHtml(ticket.departureTerminal).trim();
                            return /terminal/i.test(terminal)
                              ? terminal
                              : `Terminal ${terminal}`;
                          })()}
                        </div>
                    </div>

                    <div class="duration" style="margin-top: 2.8rem">
                        <div class="label">
                            <div class="en">${escapeHtml(duration.primary)}</div>
                        </div>
                        <div class="track">
                            <span class="dot start"></span>
                            <span class="line-seg"></span>
                            <span class="plane">${transportIcon}</span>
                            <span class="line-seg"></span>
                            <span class="dot end"></span>
                        </div>
                    </div>

                    <div class="stop arrival">
                        <div style="line-height:1.3; text-align:right;">
                            <div style="font-size:13px; color:${"var(--brand-blue)"}; font-weight:700; margin-top:2px;">${escapeHtml(arrivalDay)}</div>
                            <div style="font-size:16px; color:${"var(--brand-blue)"}; font-weight:700;">${escapeHtml(arrivalDate)}</div>
                        </div>
                        <div class="time" style="justify-content:flex-end; margin-top:4px;">${escapeHtml(arrivalTime)}</div>
                        <div class="airport">${escapeHtml(arrivalCityDisplay.city.toUpperCase())}${
                            arrivalCityDisplay.code ? ` (${escapeHtml(arrivalCityDisplay.code.toUpperCase())})` : ""
                        }</div>
                        <div class="airport-full">
                          ${(() => {
                            const detail = escapeHtml(arrivalDisplay.detail).trim();
                            return /airport$/i.test(detail)
                              ? detail.toUpperCase()
                              : `${detail.toUpperCase()} AIRPORT`;
                          })()}
                        </div>
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="passenger-section">
                <div class="section-banner">
                    <div class="title">Passenger Detail</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Passenger(s)</th>
                            <th>Ticket Number</th>
                            <th>Type</th>
                            <th>Baggage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${passengers
                        .map(
                        (passenger, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(
                                [passenger.title, passenger.name].filter(Boolean).join(" ")
                                )}</td>
                            <td>${escapeHtml(passenger.ticketNumber)}</td>
                            <td>${escapeHtml(passenger.passengerType)}</td>
                            <td>${escapeHtml(passenger.baggage)}</td>
                        </tr>
                        `
                        )
                        .join("")}
                    </tbody>
                </table>
            </div>

            <div class="fare-title">
                <span class="blue">Fares Detail</span>
            </div>

            <div class="fare-box">
                <div class="fare-row">
                    <div class="left">
                        <strong>Ticket for 1 passenger</strong>
                    </div>
                    <div class="right">${escapeHtml(formatMoney(ticket.farePerPax))}</div>
                </div>

                <div class="fare-row total">
                    <div class="left">
                        <strong>Total Amount</strong>
                    </div>
                    <div class="right">${escapeHtml(formatMoney(ticket.grandTotal))}</div>
                </div>
            </div>

            <div class="footer-notes">
                <div class="footer-note">
                    <span class="icon">${infoIcon}</span>
                    <span><strong>Present e-ticket and valid identification at check-in.</strong></span>
                </div>
                <div class="footer-note">
                    <span class="icon">${infoIcon}</span>
                    <span><strong>Check-in at least 90 minutes before departure.</strong></span>
                </div>
                <div class="footer-note">
                    <span class="icon">${infoIcon}</span>
                    <span><strong>All times shown are in local airport time.</strong></span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;
}
