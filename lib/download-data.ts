import { VesselType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";
import type { FlightOption } from "@/lib/flight-ticket/flight-options";

export const DOWNLOAD_DATA_COLUMNS = [
  { key: "bookingReference", label: "Booking Reference" },
  { key: "docDate", label: "Doc Date" },
  { key: "passengerName", label: "Passenger Name" },
  { key: "rank", label: "Rank" },
  { key: "vesselName", label: "Vessel" },
  { key: "status", label: "Status" },
  { key: "serviceArea", label: "Service Area" },
  { key: "serviceMode", label: "Service Mode" },
  { key: "serviceDetail", label: "Service Detail" },
  { key: "serviceDate", label: "Service Date" },
  { key: "serviceProvider", label: "Service Provider" },
  { key: "fare", label: "Fare" },
  { key: "ntaFare", label: "NTA Fare" },
] as const;

export type DownloadDataColumnKey = (typeof DOWNLOAD_DATA_COLUMNS)[number]["key"];

export type DownloadDataFilters = {
  functionCategory?: string;
  dateFrom?: string;
  dateTo?: string;
  columns?: string[];
};

export type DownloadDataPreviewRow = Record<DownloadDataColumnKey, string | number>;

export type DownloadDataPreviewPayload = {
  meta: {
    functionCategory: string;
    dateFrom: string;
    dateTo: string;
    itemCount: number;
    selectedColumnCount: number;
  };
  columns: typeof DOWNLOAD_DATA_COLUMNS;
  selectedColumns: DownloadDataColumnKey[];
  rows: DownloadDataPreviewRow[];
};

type TicketWithRelations = Awaited<ReturnType<typeof fetchMatchingTickets>>[number];

function normalizeDateInput(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDisplayDate(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: { toString(): string } | null | undefined) {
  if (!value) return "";

  const amount = Number(value.toString());
  if (Number.isNaN(amount)) return "";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function extractLocationCode(value: string | null | undefined) {
  const text = String(value ?? "").trim().toUpperCase();
  return text.match(/\(([A-Z]{3})\)/)?.[1] ?? text.match(/\b([A-Z]{3})\b/)?.[1] ?? "";
}

function parseFlightOptions(value: string | null): FlightOption[] {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as FlightOption[]) : [];
  } catch {
    return [];
  }
}

function getTicketRoute(ticket: TicketWithRelations) {
  const options = parseFlightOptions(ticket.flightOptionsJson);
  const firstOption = options[0];
  const lastOption = options.at(-1);
  const departure = extractLocationCode(
    firstOption?.departureCity ?? firstOption?.departureAirport ??
      ticket.departureCity ?? ticket.departureAirport
  );
  const arrival = extractLocationCode(
    lastOption?.arrivalCity ?? lastOption?.arrivalAirport ??
      ticket.arrivalCity ?? ticket.arrivalAirport
  );

  return {
    departure,
    arrival,
    serviceDetail: departure || arrival ? `${departure}-${arrival}` : "",
    serviceDate: firstOption?.departureDate ?? ticket.departureDate,
    serviceProvider: firstOption?.airline ?? ticket.airline ?? "",
  };
}

function inferServiceArea(ticket: TicketWithRelations) {
  const options = parseFlightOptions(ticket.flightOptionsJson);
  const text = [
    ...options.flatMap((option) => [
      option.departureCity,
      option.arrivalCity,
      option.departureAirport,
      option.arrivalAirport,
    ]),
    ticket.departureCity,
    ticket.arrivalCity,
    ticket.departureAirport,
    ticket.arrivalAirport,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const internationalHints = [
    "singapore", "kuala lumpur", "malaysia", "bangkok", "thailand",
    "jeddah", "dubai", "abu dhabi", "doha", "riyadh", "tokyo",
    "narita", "haneda", "incheon", "seoul", "hong kong",
  ];

  return internationalHints.some((hint) => text.includes(hint))
    ? "International"
    : "Domestic";
}

function getSelectedColumns(columns?: string[]) {
  const allowed = new Set<DownloadDataColumnKey>(
    DOWNLOAD_DATA_COLUMNS.map((column) => column.key)
  );

  const selected = (columns ?? []).filter((column): column is DownloadDataColumnKey =>
    allowed.has(column as DownloadDataColumnKey)
  );

  return selected.length
    ? selected
    : (DOWNLOAD_DATA_COLUMNS.map((column) => column.key) as DownloadDataColumnKey[]);
}

async function fetchMatchingTickets(filters: DownloadDataFilters) {
  const dateFrom = normalizeDateInput(filters.dateFrom);
  const dateTo = normalizeDateInput(filters.dateTo);

  return prisma.flightTicket.findMany({
    where: {
      ...(filters.functionCategory?.trim()
        ? {
            functionCategory: filters.functionCategory.trim() as VesselType,
          }
        : {}),
      departureDate:
        dateFrom || dateTo
          ? {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            }
          : undefined,
    },
    include: {
      vessel: {
        select: {
          name: true,
        },
      },
      passengers: {
        include: {
          rank: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

function buildRows(tickets: TicketWithRelations[]) {
  const rows: DownloadDataPreviewRow[] = [];

  tickets.forEach((ticket) => {
    const passengers = ticket.passengers.length
      ? ticket.passengers
      : [
          {
            id: `${ticket.id}-empty`,
            name: "",
            title: null,
            rank: null,
            passengerType: null,
            baggage: null,
            ticketNumber: null,
            createdAt: new Date(),
            flightTicketId: ticket.id,
            rankId: null,
          },
        ];

    passengers.forEach((passenger) => {
      const route = getTicketRoute(ticket);

      rows.push({
        bookingReference: ticket.bookingReference ?? "",
        docDate: formatDisplayDate(ticket.createdAt),
        passengerName: passenger.name ?? "",
        rank: passenger.rank?.name ?? "",
        vesselName: ticket.vessel?.name ?? "",
        status: ticket.assign ?? "",
        serviceArea: inferServiceArea(ticket),
        serviceMode: ticket.serviceMode ?? "",
        serviceDetail: route.serviceDetail,
        serviceDate: formatDisplayDate(route.serviceDate),
        serviceProvider: route.serviceProvider,
        fare: formatMoney(ticket.farePerPax),
        ntaFare: formatMoney(ticket.ntaFare),
      });
    });
  });

  return rows;
}

export async function buildDownloadDataPreview(
  filters: DownloadDataFilters
): Promise<DownloadDataPreviewPayload> {
  const tickets = await fetchMatchingTickets(filters);
  const rows = buildRows(tickets);
  const selectedColumns = getSelectedColumns(filters.columns);

  return {
    meta: {
      functionCategory: filters.functionCategory?.replaceAll("_", " ") ?? "",
      dateFrom: formatDisplayDate(filters.dateFrom),
      dateTo: formatDisplayDate(filters.dateTo),
      itemCount: rows.length,
      selectedColumnCount: selectedColumns.length,
    },
    columns: DOWNLOAD_DATA_COLUMNS,
    selectedColumns,
    rows,
  };
}

export async function buildDownloadDataCsv(filters: DownloadDataFilters) {
  const preview = await buildDownloadDataPreview(filters);
  const selectedDefinitions = preview.columns.filter((column) =>
    preview.selectedColumns.includes(column.key)
  );

  const header = toCsvRow(selectedDefinitions.map((column) => column.label));
  const lines = preview.rows.map((row) =>
    toCsvRow(selectedDefinitions.map((column) => String(row[column.key] ?? "")))
  );

  return [header, ...lines].join("\n");
}
