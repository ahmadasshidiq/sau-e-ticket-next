import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardTicketChart } from "@/components/dashboard-ticket-chart";
import { prisma } from "@/lib/prisma";

const TODAY = new Date("2026-07-25T23:59:59+07:00");
const ALL_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const CLIENT_ORDER = ["CT", "CM"] as const;

type ClientKey = (typeof CLIENT_ORDER)[number];
type MonthlySeries = number[];

type VendorSummary = {
  name: string;
  monthlyTickets: MonthlySeries;
  monthlyAmounts: MonthlySeries;
  totalTickets: number;
  totalAmount: number;
};

type ClientSummary = {
  key: ClientKey;
  title: string;
  functionCategory: "CREWING_TANKER" | "CMOS";
  monthlyTickets: MonthlySeries;
  monthlyAmounts: MonthlySeries;
  totalTickets: number;
  totalAmount: number;
  vendors: Record<string, VendorSummary>;
};

type DashboardSummary = {
  selectedYear: number;
  monthLabels: string[];
  generatedAtLabel: string;
  totalTicketsYtd: number;
  totalAmountYtd: number;
  availableYears: number[];
  clients: Record<ClientKey, ClientSummary>;
};

type TicketRecord = {
  functionCategory: "CREWING_TANKER" | "CMOS" | "TAD" | null;
  provider: string | null;
  farePerPax: { toString(): string } | null;
  grandTotal: { toString(): string } | null;
  quantity: number | null;
  departureDate: Date | null;
  passengers: Array<{ id: string }>;
};

function createMonthlySeries(): MonthlySeries {
  return ALL_MONTH_LABELS.map(() => 0);
}

function createVendorSummary(name: string): VendorSummary {
  return {
    name,
    monthlyTickets: createMonthlySeries(),
    monthlyAmounts: createMonthlySeries(),
    totalTickets: 0,
    totalAmount: 0,
  };
}

function createClientSummary(
  key: ClientKey,
  title: string,
  functionCategory: "CREWING_TANKER" | "CMOS"
): ClientSummary {
  return {
    key,
    title,
    functionCategory,
    monthlyTickets: createMonthlySeries(),
    monthlyAmounts: createMonthlySeries(),
    totalTickets: 0,
    totalAmount: 0,
    vendors: {},
  };
}

function toNumber(
  value: { toString(): string } | number | string | null | undefined
) {
  if (value === null || value === undefined) {
    return 0;
  }

  const normalized = Number(
    typeof value === "object" && "toString" in value ? value.toString() : value
  );

  return Number.isFinite(normalized) ? normalized : 0;
}

function resolveVendor(provider: string | null | undefined) {
  const normalized = provider?.trim();

  if (!normalized) {
    return "-";
  }

  return normalized;
}

function resolveTicketCount(ticket: TicketRecord) {
  if (ticket.passengers.length > 0) return ticket.passengers.length;
  if ((ticket.quantity ?? 0) > 0) return ticket.quantity ?? 0;
  return 1;
}

function resolveTicketAmount(ticket: TicketRecord, ticketCount: number) {
  const farePerPax = toNumber(ticket.farePerPax);
  if (farePerPax > 0) {
    return farePerPax * ticketCount;
  }

  return toNumber(ticket.grandTotal);
}

function formatCurrency(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function getDashboardSummary(selectedYear: number): Promise<DashboardSummary> {
  const yearStart = new Date(`${selectedYear}-01-01T00:00:00+07:00`);
  const yearEnd =
    selectedYear === TODAY.getUTCFullYear()
      ? TODAY
      : new Date(`${selectedYear}-12-31T23:59:59+07:00`);

  const [tickets, earliestTicket] = await Promise.all([
    prisma.flightTicket.findMany({
      where: {
        status: "GENERATED",
        functionCategory: {
          in: ["CREWING_TANKER", "CMOS"],
        },
        departureDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: {
        functionCategory: true,
        provider: true,
        farePerPax: true,
        grandTotal: true,
        quantity: true,
        departureDate: true,
        passengers: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        departureDate: "asc",
      },
    }) as Promise<TicketRecord[]>,
    prisma.flightTicket.findFirst({
      where: {
        status: "GENERATED",
        functionCategory: {
          in: ["CREWING_TANKER", "CMOS"],
        },
        departureDate: {
          not: null,
        },
      },
      orderBy: {
        departureDate: "asc",
      },
      select: {
        departureDate: true,
      },
    }),
  ]);

  const earliestYear =
    earliestTicket?.departureDate?.getUTCFullYear() ?? TODAY.getUTCFullYear();
  const availableYears: number[] = [];

  for (let year = TODAY.getUTCFullYear(); year >= earliestYear; year -= 1) {
    availableYears.push(year);
  }

  const clients: Record<ClientKey, ClientSummary> = {
    CT: createClientSummary("CT", "Crew Tanker", "CREWING_TANKER"),
    CM: createClientSummary("CM", "Crew Marine", "CMOS"),
  };

  for (const ticket of tickets) {
    if (!ticket.departureDate) continue;

    const monthIndex = ticket.departureDate.getUTCMonth();
    if (monthIndex < 0 || monthIndex >= ALL_MONTH_LABELS.length) continue;

    const clientKey =
      ticket.functionCategory === "CREWING_TANKER"
        ? "CT"
        : ticket.functionCategory === "CMOS"
          ? "CM"
          : null;

    if (!clientKey) continue;

    const client = clients[clientKey];
    const vendorKey = resolveVendor(ticket.provider);
    const ticketCount = resolveTicketCount(ticket);
    const ticketAmount = resolveTicketAmount(ticket, ticketCount);

    client.monthlyTickets[monthIndex] += ticketCount;
    client.monthlyAmounts[monthIndex] += ticketAmount;
    client.totalTickets += ticketCount;
    client.totalAmount += ticketAmount;

    if (!client.vendors[vendorKey]) {
      client.vendors[vendorKey] = createVendorSummary(vendorKey);
    }

    client.vendors[vendorKey].monthlyTickets[monthIndex] += ticketCount;
    client.vendors[vendorKey].monthlyAmounts[monthIndex] += ticketAmount;
    client.vendors[vendorKey].totalTickets += ticketCount;
    client.vendors[vendorKey].totalAmount += ticketAmount;
  }

  const visibleMonthCount =
    12;
  const monthLabels = ALL_MONTH_LABELS.slice(0, visibleMonthCount);

  return {
    selectedYear,
    monthLabels,
    generatedAtLabel: formatDateLabel(TODAY),
    availableYears,
    totalTicketsYtd: CLIENT_ORDER.reduce(
      (sum, key) => sum + clients[key].totalTickets,
      0
    ),
    totalAmountYtd: CLIENT_ORDER.reduce(
      (sum, key) => sum + clients[key].totalAmount,
      0
    ),
    clients,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawYear = Number(resolvedSearchParams?.year ?? TODAY.getUTCFullYear());
  const selectedYear = Number.isFinite(rawYear) ? rawYear : TODAY.getUTCFullYear();
  const summary = await getDashboardSummary(selectedYear);

  return (
    <DashboardShell
      title="Dashboard"
      description={`Travel ticketing YTD dashboard for Crew Tanker and Crew Marine for ${summary.selectedYear}. Data updated through ${summary.generatedAtLabel}.`}
    >
      <div className="space-y-6">
        <section className="rounded-[22px] border border-[#e6e6e6] bg-white px-6 py-5 shadow-[0_4px_14px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#111827] dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#1f1f1f] dark:text-white">
                Year Filter
              </h2>
              <p className="mt-1 text-[13px] text-[#8d8d8d] dark:text-[#94a3b8]">
                {summary.selectedYear === TODAY.getUTCFullYear()
                  ? `Showing January through December ${summary.selectedYear}. Data is available through ${summary.generatedAtLabel}`
                  : `Showing January through December ${summary.selectedYear}.`}
              </p>
            </div>

            {summary.availableYears.length > 1 ? (
              <form className="flex items-center gap-3">
                <label
                  htmlFor="dashboard-year"
                  className="text-[14px] font-medium text-[#4b5563] dark:text-[#d1d5db]"
                >
                  Year
                </label>
                <select
                  id="dashboard-year"
                  name="year"
                  defaultValue={String(summary.selectedYear)}
                  className="h-[46px] rounded-[14px] border border-[#d1d5db] bg-white px-4 text-[14px] font-medium text-[#111827] outline-none dark:border-white/10 dark:bg-[#151d2c] dark:text-white"
                >
                  {summary.availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-[46px] rounded-[14px] bg-[#4438ff] px-5 text-[14px] font-medium text-white hover:bg-[#3c31ec]"
                >
                  Apply
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-[#4b5563] dark:text-[#d1d5db]">
                  Year
                </span>
                <div className="inline-flex h-[46px] items-center rounded-[14px] border border-[#d1d5db] bg-[#fafafa] px-4 text-[14px] font-semibold text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                  {summary.selectedYear}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <TopMetric
            title="Total Tickets YTD"
            value={String(summary.totalTicketsYtd)}
            helper={`All clients in ${summary.selectedYear}`}
            tone="blue"
          />
          <TopMetric
            title="Total Purchases YTD"
            value={formatCurrency(summary.totalAmountYtd)}
            helper="Accumulated purchase amount"
            tone="green"
          />
          {CLIENT_ORDER.map((key) => (
            <TopMetric
              key={key}
              title={`${summary.clients[key].title} (${key})`}
              value={`${summary.clients[key].totalTickets} tickets`}
              helper={formatCurrency(summary.clients[key].totalAmount)}
              tone={key === "CT" ? "indigo" : "cyan"}
            />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          {CLIENT_ORDER.map((key) => (
            <ClientPanel
              key={key}
              client={summary.clients[key]}
              monthLabels={summary.monthLabels}
              selectedYear={summary.selectedYear}
            />
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}

function TopMetric({
  title,
  value,
  helper,
  tone,
}: {
  title: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "indigo" | "cyan";
}) {
  const badgeClass =
    tone === "green"
      ? "bg-[#ecfdf3] text-[#15803d]"
      : tone === "indigo"
        ? "bg-[#eef2ff] text-[#4338ca]"
        : tone === "cyan"
          ? "bg-[#ecfeff] text-[#0f766e]"
          : "bg-[#eff6ff] text-[#1d4ed8]";

  return (
    <article className="rounded-[22px] border border-[#e6e6e6] bg-white px-6 py-5 shadow-[0_4px_14px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#111827] dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]">
      <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${badgeClass}`}>
        {title}
      </span>
      <p className="mt-4 text-[20px] font-bold tracking-[-0.03em] text-[#1f2937] dark:text-white sm:text-[24px]">
        {value}
      </p>
      <p className="mt-2 text-[13px] text-[#8d8d8d] dark:text-[#94a3b8]">{helper}</p>
    </article>
  );
}

function ClientPanel({
  client,
  monthLabels,
  selectedYear,
}: {
  client: ClientSummary;
  monthLabels: string[];
  selectedYear: number;
}) {
  return (
    <article className="rounded-[22px] border border-[#e6e6e6] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#111827] dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]">
      <div className="border-b border-[#ececec] px-6 py-5 dark:border-white/10">
        <div className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#1e1e1e] dark:text-white">
              {client.title} ({client.key})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InlineMetric label="YTD Tickets" value={String(client.totalTickets)} />
            <InlineMetric label="YTD Value" value={formatCurrency(client.totalAmount)} accent />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <section className="rounded-[20px] border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-[#0f172a]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#2f2f2f] dark:text-white">
                Tickets Created per Month
              </h3>
              <p className="mt-1 text-[13px] text-[#8d8d8d] dark:text-[#94a3b8]">
                Ticket count and amount per month in {selectedYear}
              </p>
            </div>
          </div>
          <DashboardTicketChart
            monthLabels={monthLabels}
            monthlyTickets={client.monthlyTickets}
            monthlyAmounts={client.monthlyAmounts}
          />
        </section>

        <VendorTable
          title="Tickets per Vendor"
          monthLabels={monthLabels}
          unit="ticket"
          vendors={Object.values(client.vendors).sort((left, right) =>
            left.name.localeCompare(right.name)
          )}
          valueSelector={(vendor) => vendor.monthlyTickets}
          totalSelector={(vendor) => vendor.totalTickets}
        />

        <VendorTable
          title="Ticket Purchases per Vendor"
          monthLabels={monthLabels}
          unit="currency"
          vendors={Object.values(client.vendors).sort((left, right) =>
            left.name.localeCompare(right.name)
          )}
          valueSelector={(vendor) => vendor.monthlyAmounts}
          totalSelector={(vendor) => vendor.totalAmount}
        />
      </div>
    </article>
  );
}

function InlineMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border px-5 py-4 ${
        accent
          ? "border-[#d7f0de] bg-[#f4fbf6] dark:border-[#214b31] dark:bg-[#0f1e16]"
          : "border-[#ececec] bg-[#fafafa] dark:border-white/10 dark:bg-[#0f172a]"
      }`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8d8d8d] dark:text-[#94a3b8]">
        {label}
      </p>
      <p
        className={`mt-2 text-[18px] font-bold tracking-[-0.03em] ${
          accent ? "text-[#15803d] dark:text-[#86efac]" : "text-[#1e1e1e] dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function VendorTable({
  title,
  monthLabels,
  unit,
  vendors,
  valueSelector,
  totalSelector,
}: {
  title: string;
  monthLabels: string[];
  unit: "ticket" | "currency";
  vendors: VendorSummary[];
  valueSelector: (vendor: VendorSummary) => MonthlySeries;
  totalSelector: (vendor: VendorSummary) => number;
}) {
  const visibleMonthCount = monthLabels.length;
  const monthlyTotals = monthLabels.map((_, monthIndex) =>
    vendors.reduce((sum, vendor) => sum + valueSelector(vendor)[monthIndex], 0)
  );
  const overallTotal = vendors.reduce((sum, vendor) => sum + totalSelector(vendor), 0);

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#ececec] bg-white dark:border-white/10 dark:bg-[#0f172a]">
      <div className="border-b border-[#ececec] px-5 py-4 dark:border-white/10">
        <h3 className="text-[16px] font-semibold text-[#2f2f2f] dark:text-white">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa] dark:bg-[#101828]">
              <th className="border-b border-[#ececec] px-4 py-3 text-left text-[13px] font-semibold text-[#8d8d8d] dark:border-white/10 dark:text-[#94a3b8]">
                Vendor
              </th>
              {monthLabels.map((label) => (
                <th
                  key={label}
                  className="border-b border-[#ececec] px-4 py-3 text-center text-[13px] font-semibold text-[#8d8d8d] dark:border-white/10 dark:text-[#94a3b8]"
                >
                  {label}
                </th>
              ))}
              <th className="border-b border-[#ececec] px-4 py-3 text-center text-[13px] font-semibold text-[#8d8d8d] dark:border-white/10 dark:text-[#94a3b8]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.name} className="odd:bg-white even:bg-[#fcfcfd] dark:odd:bg-[#0f172a] dark:even:bg-[#101827]">
                <td className="border-b border-[#f1f1f1] px-4 py-3 text-[14px] font-medium text-[#2f2f2f] dark:border-white/10 dark:text-white">
                  {vendor.name}
                </td>
                {valueSelector(vendor).slice(0, visibleMonthCount).map((value, index) => (
                  <td
                    key={`${vendor.name}-${index}`}
                    className="border-b border-[#f1f1f1] px-4 py-3 text-center text-[14px] text-[#555] dark:border-white/10 dark:text-[#d1d5db]"
                  >
                    {unit === "currency" ? formatTableCurrency(value) : value}
                  </td>
                ))}
                <td className="border-b border-[#f1f1f1] px-4 py-3 text-center text-[14px] font-semibold text-[#2f2f2f] dark:border-white/10 dark:text-white">
                  {unit === "currency" ? formatTableCurrency(totalSelector(vendor)) : totalSelector(vendor)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#fafafa] dark:bg-[#101828]">
              <td className="px-4 py-3 text-[14px] font-semibold text-[#1e1e1e] dark:text-white">
                Total
              </td>
              {monthlyTotals.map((value, index) => (
                <td
                  key={`total-${index}`}
                  className="px-4 py-3 text-center text-[14px] font-semibold text-[#1e1e1e] dark:text-white"
                >
                  {unit === "currency" ? formatTableCurrency(value) : value}
                </td>
              ))}
              <td className="px-4 py-3 text-center text-[14px] font-semibold text-[#1e1e1e] dark:text-white">
                {unit === "currency" ? formatTableCurrency(overallTotal) : overallTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatTableCurrency(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}
