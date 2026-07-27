import { VesselType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCsvRow } from "@/lib/csv";

export const DOWNLOAD_DATA_COLUMNS = [
  { key: "no", label: "No" },
  { key: "vesselName", label: "Vessel Name" },
  { key: "passengerName", label: "Passenger Name" },
  { key: "assign", label: "Assign" },
  { key: "serviceMode", label: "Service Mode" },
  { key: "pnr", label: "PNR" },
  { key: "provider", label: "Provider" },
  { key: "airline", label: "Airline" },
  { key: "ticketNumber", label: "Ticket Number" },
  { key: "rank", label: "Rank" },
  { key: "title", label: "Title" },
  { key: "bookingReference", label: "Booking Reference" },
  { key: "departureDate", label: "Departure Date" },
  { key: "arrivalDate", label: "Arrival Date" },
  { key: "departureCity", label: "Departure City" },
  { key: "arrivalCity", label: "Arrival City" },
  { key: "departureAirport", label: "Departure Airport" },
  { key: "arrivalAirport", label: "Arrival Airport" },
  { key: "flightNumber", label: "Flight Number" },
  { key: "cabinClass", label: "Cabin Class" },
  { key: "farePerPax", label: "Fare / Pax" },
  { key: "grandTotal", label: "Grand Total" },
  { key: "status", label: "Status" },
  { key: "functionCategory", label: "Function" },
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

function formatDateTime(value?: Date | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
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

function getSelectedColumns(columns?: string[]) {
  const allowed = new Set<DownloadDataColumnKey>(
    DOWNLOAD_DATA_COLUMNS.map((column) => column.key)
  );

  const selected = (columns ?? []).filter((column): column is DownloadDataColumnKey =>
    allowed.has(column as DownloadDataColumnKey)
  );

  return selected.length
    ? selected
    : (DOWNLOAD_DATA_COLUMNS.slice(0, 8).map((column) => column.key) as DownloadDataColumnKey[]);
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
    orderBy: [{ departureDate: "asc" }, { createdAt: "asc" }],
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
      rows.push({
        no: rows.length + 1,
        vesselName: ticket.vessel?.name ?? "",
        passengerName: passenger.name ?? "",
        assign: ticket.assign ?? "",
        serviceMode: ticket.serviceMode ?? "",
        pnr: ticket.pnr ?? "",
        provider: ticket.provider ?? "",
        airline: ticket.airline ?? "",
        ticketNumber: passenger.ticketNumber ?? ticket.ticketNumber ?? "",
        rank: passenger.rank?.name ?? "",
        title: passenger.title ?? "",
        bookingReference: ticket.bookingReference ?? "",
        departureDate: formatDateTime(ticket.departureDate),
        arrivalDate: formatDateTime(ticket.arrivalDate),
        departureCity: ticket.departureCity ?? "",
        arrivalCity: ticket.arrivalCity ?? "",
        departureAirport: ticket.departureAirport ?? "",
        arrivalAirport: ticket.arrivalAirport ?? "",
        flightNumber: ticket.flightNumber ?? "",
        cabinClass: ticket.cabinClass ?? "",
        farePerPax: formatMoney(ticket.farePerPax),
        grandTotal: formatMoney(ticket.grandTotal),
        status: ticket.status,
        functionCategory: ticket.functionCategory
          ? ticket.functionCategory.replaceAll("_", " ")
          : "",
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
