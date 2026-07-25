import { prisma } from "@/lib/prisma";

type PassengerRecord = {
  id: string;
  rankId: string | null;
  rank: {
    id: string;
    name: string;
  } | null;
  title: string | null;
  name: string;
};

type TicketRecord = {
  id: string;
  vesselId: string | null;
  vessel: {
    id: string;
    name: string;
    type: string;
  } | null;
  assign: string | null;
  serviceMode: string | null;
  airline: string | null;
  departureDate: Date | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  farePerPax: { toString(): string } | null;
  passengers: PassengerRecord[];
};

export type InvoiceGeneratorFilters = {
  vesselId?: string;
  dateFrom?: string;
  dateTo?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  customer?: string;
  customerAddress?: string;
  customerPhone?: string;
  consolidatedInvoiceNumber?: string;
};

export type InvoicePreviewRow = {
  no: number;
  vesselName: string;
  title: string;
  passenger: string;
  rank: string;
  status: string;
  serviceDate: string;
  serviceArea: string;
  serviceMode: string;
  serviceProvider: string;
  serviceDetail: string;
  fare: string;
};

export type InvoicePreviewPayload = {
  meta: {
    vesselName: string;
    groupCount: number;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    customer: string;
    customerAddress: string;
    customerPhone: string;
    consolidatedInvoiceNumber: string;
    itemCount: number;
    totalFare: string;
  };
  rows: InvoicePreviewRow[];
};

type InvoiceGroupedRows = {
  vesselName: string;
  rows: InvoicePreviewRow[];
  totalFare: string;
};

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

function formatCsvDate(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/ /g, "-");
}

function formatMoney(value: string | number) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function extractAirportCode(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  const matchedCode = text.match(/\(([A-Z]{3})\)/)?.[1];

  if (matchedCode) {
    return matchedCode;
  }

  const fallbackCode = text.match(/\b([A-Z]{3})\b/)?.[1];
  return fallbackCode ?? text.toUpperCase().slice(0, 3);
}

function inferServiceArea(ticket: TicketRecord) {
  const text = [
    ticket.departureAirport,
    ticket.arrivalAirport,
    ticket.departureCity,
    ticket.arrivalCity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const internationalHints = [
    "singapore",
    "kuala lumpur",
    "malaysia",
    "bangkok",
    "thailand",
    "jeddah",
    "dubai",
    "abu dhabi",
    "doha",
    "riyadh",
    "tokyo",
    "narita",
    "haneda",
    "incheon",
    "seoul",
    "hong kong",
  ];

  return internationalHints.some((item) => text.includes(item))
    ? "International"
    : "Domestic";
}

function buildServiceDetail(ticket: TicketRecord) {
  const departureCode = extractAirportCode(
    ticket.departureCity ?? ticket.departureAirport
  );
  const arrivalCode = extractAirportCode(
    ticket.arrivalCity ?? ticket.arrivalAirport
  );

  if (!departureCode && !arrivalCode) {
    return "-";
  }

  return `${departureCode}-${arrivalCode}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toCsvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function fetchMatchingTickets(filters: InvoiceGeneratorFilters) {
  const dateFrom = normalizeDateInput(filters.dateFrom);
  const dateTo = normalizeDateInput(filters.dateTo);

  return prisma.flightTicket.findMany({
    where: {
      ...(filters.vesselId?.trim() ? { vesselId: filters.vesselId.trim() } : {}),
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
          id: true,
          name: true,
          type: true,
        },
      },
      passengers: {
        include: {
          rank: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { departureDate: "asc" },
      { createdAt: "asc" },
    ],
  }) as Promise<TicketRecord[]>;
}

export async function buildInvoicePreview(
  filters: InvoiceGeneratorFilters
): Promise<InvoicePreviewPayload> {
  const tickets = await fetchMatchingTickets(filters);
  const vesselName = filters.vesselId?.trim()
    ? tickets[0]?.vessel?.name ?? ""
    : "Grouped by Vessel";

  const rows = tickets.flatMap((ticket) => {
    const resolvedVesselName = ticket.vessel?.name?.trim() || "All Vessel";

    return ticket.passengers.map((passenger) => ({
      vesselName: resolvedVesselName,
      title: passenger.title ?? "",
      passenger: passenger.name,
      rank: passenger.rank?.name ?? "",
      status: ticket.assign ?? "",
      serviceDate: formatCsvDate(ticket.departureDate),
      serviceArea: inferServiceArea(ticket),
      serviceMode: ticket.serviceMode ?? "",
      serviceProvider: ticket.airline ?? "",
      serviceDetail: buildServiceDetail(ticket),
      fare: ticket.farePerPax?.toString() ?? "0",
    }));
  });

  rows.sort((left, right) => {
    const vesselCompare = left.vesselName.localeCompare(right.vesselName);
    if (vesselCompare !== 0) {
      return vesselCompare;
    }

    return left.serviceDate.localeCompare(right.serviceDate);
  });

  const numberedRows: InvoicePreviewRow[] = rows.map((row, index) => ({
    no: index + 1,
    ...row,
    fare: formatMoney(row.fare),
  }));

  const totalFare = rows.reduce((sum, row) => sum + Number(row.fare), 0);
  const groupCount = new Set(numberedRows.map((row) => row.vesselName)).size;

  return {
    meta: {
      vesselName,
      groupCount,
      invoiceNumber: filters.invoiceNumber?.trim() ?? "",
      invoiceDate: formatDisplayDate(filters.invoiceDate) || "",
      dueDate: formatDisplayDate(filters.dueDate) || "",
      customer: filters.customer?.trim() ?? "",
      customerAddress: filters.customerAddress?.trim() ?? "",
      customerPhone: filters.customerPhone?.trim() ?? "",
      consolidatedInvoiceNumber:
        filters.consolidatedInvoiceNumber?.trim() ?? "",
      itemCount: numberedRows.length,
      totalFare: formatMoney(totalFare),
    },
    rows: numberedRows,
  };
}

export async function buildInvoiceCsv(filters: InvoiceGeneratorFilters) {
  const preview = await buildInvoicePreview(filters);
  const groupedRows = preview.rows.reduce<InvoiceGroupedRows[]>((groups, row) => {
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.vesselName !== row.vesselName) {
      groups.push({
        vesselName: row.vesselName,
        rows: [row],
        totalFare: row.fare,
      });
      return groups;
    }

    currentGroup.rows.push(row);
    return groups;
  }, []);
  const lines = [
    [
      "Passenger",
      "Rank",
      "Status",
      "Service Date",
      "Service Area",
      "Service Mode",
      "Service Provider",
      "Service Detail",
      "Fare",
    ]
      .map(toCsvCell)
      .join(","),
    ...groupedRows.flatMap((group) => [
      [toCsvCell(`Vessel: ${group.vesselName}`), "", "", "", "", "", "", "", ""].join(","),
      ...group.rows.map((row) =>
        [
          [row.title, row.passenger].filter(Boolean).join(". ").replace(/\.\s\./g, "."),
          row.rank,
          row.status,
          row.serviceDate,
          row.serviceArea,
          row.serviceMode,
          row.serviceProvider,
          row.serviceDetail,
          row.fare,
        ]
          .map(toCsvCell)
          .join(",")
      ),
    ]),
    [
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell(""),
      toCsvCell("TOTAL"),
      toCsvCell(preview.meta.totalFare),
    ].join(","),
  ];

  return lines.join("\n");
}

export async function buildInvoicePdfHtml(filters: InvoiceGeneratorFilters) {
  const preview = await buildInvoicePreview(filters);
  const groupedRows = preview.rows.reduce<InvoiceGroupedRows[]>((groups, row) => {
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.vesselName !== row.vesselName) {
      groups.push({
        vesselName: row.vesselName,
        rows: [row],
        totalFare: row.fare,
      });
      return groups;
    }

    currentGroup.rows.push(row);
    return groups;
  }, []);

  const rowsMarkup =
    groupedRows.length > 0
      ? groupedRows
          .map(
            (group) => `
              <tr class="group-row">
                <td colspan="9">Vessel: ${escapeHtml(group.vesselName)}</td>
              </tr>
              ${group.rows
                .map(
                  (row) => `
              <tr>
                <td>${escapeHtml(row.title ? `${row.title}. ${row.passenger}` : row.passenger)}</td>
                <td>${escapeHtml(row.rank || "-")}</td>
                <td>${escapeHtml(row.status || "-")}</td>
                <td>${escapeHtml(row.serviceDate || "-")}</td>
                <td>${escapeHtml(row.serviceArea || "-")}</td>
                <td>${escapeHtml(row.serviceMode || "-")}</td>
                <td>${escapeHtml(row.serviceProvider || "-")}</td>
                <td>${escapeHtml(row.serviceDetail || "-")}</td>
                <td class="right">${escapeHtml(row.fare)}</td>
              </tr>
            `
                )
                .join("")}
            `
          )
          .join("")
      : `
        <tr>
          <td colspan="9" class="empty">No invoice rows found for the selected filters.</td>
        </tr>
      `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(preview.meta.invoiceNumber || preview.meta.consolidatedInvoiceNumber || "Draft")}</title>
  <style>
    @page { size: A4 landscape; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }
    .sheet { width: 100%; }
    .header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 16px; margin-bottom: 26px; }
    .billto { font-size: 14px; line-height: 1.55; }
    .billto strong { display: block; margin-bottom: 12px; }
    .title { text-align: center; font-size: 18px; font-weight: 700; margin-top: 24px; }
    .meta { text-align: right; font-size: 14px; line-height: 1.8; font-weight: 700; }
    .vessel-bar { display: grid; grid-template-columns: 240px 24px 1fr; width: 520px; margin: 18px 0 22px; background: #f3f4f6; }
    .vessel-bar div { padding: 4px 8px; font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #2d3748; padding: 8px 10px; font-size: 13px; }
    th { background: #c7d7f2; text-align: center; font-size: 12px; }
    td { vertical-align: top; }
    .group-row td { background: #eef2ff; font-weight: 700; color: #1e3a8a; }
    td.right { text-align: right; white-space: nowrap; }
    td.center { text-align: center; }
    .total-row td { background: #c7d7f2; font-weight: 700; }
    .empty { text-align: center; color: #6b7280; padding: 20px; }
    .notes { margin-top: 26px; font-size: 13px; line-height: 1.65; }
    .notes strong { font-size: 14px; }
    .bank { margin-top: 24px; font-size: 13px; line-height: 1.8; }
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #374151; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="billto">
        <strong>Bill To:</strong>
        <div>${escapeHtml(preview.meta.customer || "-")}</div>
        <div>${escapeHtml(preview.meta.customerAddress || "-")}</div>
        <div>${escapeHtml(preview.meta.customerPhone || "-")}</div>
      </div>
      <div class="title">Consolidated Invoice: ${escapeHtml(preview.meta.consolidatedInvoiceNumber || preview.meta.invoiceNumber || "-")}</div>
      <div class="meta">
        <div>Date : ${escapeHtml(preview.meta.invoiceDate || "-")}</div>
        <div>Payment Due Date : ${escapeHtml(preview.meta.dueDate || "-")}</div>
      </div>
    </div>

    <div class="vessel-bar">
      <div>Vessel Name</div>
      <div>:</div>
      <div>${escapeHtml(preview.meta.vesselName || "-")}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Passenger</th>
          <th>Rank</th>
          <th>Status</th>
          <th>Service Date</th>
          <th>Service Area</th>
          <th>Service Mode</th>
          <th>Service Provider</th>
          <th>Service Detail</th>
          <th>Fare</th>
        </tr>
      </thead>
      <tbody>
        ${rowsMarkup}
        <tr class="total-row">
          <td colspan="8" class="center">TOTAL</td>
          <td class="right">${escapeHtml(preview.meta.totalFare)}</td>
        </tr>
      </tbody>
    </table>

    <div class="notes">
      <div><strong>This is electronically generated and no signature is required.</strong></div>
      <div>Remark(s):</div>
      <div>Payment Instruction: Please transfer funds to the account below and notify us at finance@artama.id</div>
    </div>

    <div class="bank">
      <div><strong>Bank</strong> : Bank Mandiri</div>
      <div><strong>Bank Address</strong> : KCP Jakarta Bintaro Jaya</div>
      <div><strong>Account Name</strong> : PT Sinergi Arah Utama</div>
      <div><strong>Account Number</strong> : 101 001 3657539</div>
      <div><strong>Account Currency</strong> : IDR</div>
    </div>

    <div class="footer">
      PT Sinergi Arah Utama (NPWP #83.889.140.6-013.000)<br/>
      Jl. R.C. Veteran Raya No. 11B | Jakarta Selatan | DKI Jakarta | Indonesia 12330 | 0811132422 | admin@artama.id
    </div>
  </div>
</body>
</html>
`;
}
