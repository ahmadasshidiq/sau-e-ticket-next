"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Download01Icon, File01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchableSelect, type SearchableSelectOption } from "@/components/searchable-select";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedRemoteSearch } from "@/hooks/use-debounced-remote-search";
import { toast } from "@/lib/toast";

type VesselOption = {
  id: string;
  name: string;
  type: string;
};

type InvoicePreviewRow = {
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

type InvoicePreviewResponse = {
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

type InvoiceForm = {
  vesselId: string;
  dateFrom: string;
  dateTo: string;
  invoiceNumber: string;
  consolidatedInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customer: string;
  customerAddress: string;
  customerPhone: string;
};

const fieldClassName =
  "h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b] dark:[color-scheme:dark] dark:[&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:opacity-85 dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-200";

const defaultForm: InvoiceForm = {
  vesselId: "",
  dateFrom: "",
  dateTo: "",
  invoiceNumber: "",
  consolidatedInvoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  customer: "PT. PERTAMINA MARINE SOLUTIONS",
  customerAddress: "Jl. Yos Sudarso No.34, RT.19/RW.14, Rawa Badak Utara, Tanjung Priok Jakarta Utara 14320",
  customerPhone: "Telp : 021 - 653 07030",
};

function buildSearchParams(form: InvoiceForm) {
  const searchParams = new URLSearchParams();

  Object.entries(form).forEach(([key, value]) => {
    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  return searchParams;
}

export default function InvoicesPage() {
  const [form, setForm] = useState<InvoiceForm>(defaultForm);
  const [vesselSearch, setVesselSearch] = useState("");
  const [isVesselOpen, setIsVesselOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [preview, setPreview] = useState<InvoicePreviewResponse | null>(null);

  const {
    items: vessels,
    loading: loadingVessels,
  } = useDebouncedRemoteSearch<VesselOption>({
    query: vesselSearch,
    search: async (query, signal) => {
      const searchParams = new URLSearchParams({
        page: "1",
        pageSize: "10",
      });

      if (query.trim()) {
        searchParams.set("name", query.trim());
      }

      const response = await fetch(`/api/vessels?${searchParams.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Failed to load vessels.");
      }

      const result = (await response.json()) as {
        data?: VesselOption[];
      };

      return result.data ?? [];
    },
    onError: (error) => {
      toast({
        title: "Failed to load vessels",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  async function handlePreview() {
    setLoadingPreview(true);

    try {
      const params = buildSearchParams(form);
      const response = await fetch(`/api/invoices/preview?${params.toString()}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as
        | InvoicePreviewResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in result ? result.message ?? "Failed to load invoice preview." : "Failed to load invoice preview."
        );
      }

      setPreview(result as InvoicePreviewResponse);
    } catch (error) {
      toast({
        title: "Preview failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true);

    try {
      const params = buildSearchParams(form);
      const response = await fetch(`/api/invoices/export?${params.toString()}`);

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to export invoice table.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${form.invoiceNumber || form.consolidatedInvoiceNumber || "invoice-export"}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setExportingCsv(false);
    }
  }

  function handleGeneratePdf() {
    const params = buildSearchParams(form);
    window.open(`/api/invoices/generate?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <DashboardShell
      title="Invoice"
      description="Generate invoice table and invoice PDF from validated ticketing data."
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 dark:border-white/10 dark:bg-[#111827]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[#111827] dark:text-white">
              Invoice Generator
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
              Filter ticketing data by vessel and period, preview the invoice table, then export CSV or print the invoice PDF.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-4">
            <SearchableSelect
              label="Vessel"
              value={vesselSearch}
              selectedId={form.vesselId}
              loading={loadingVessels}
              open={isVesselOpen}
              options={vessels.map<SearchableSelectOption>((vessel) => ({
                id: vessel.id,
                label: vessel.name,
                meta: vessel.type,
              }))}
              placeholder="All vessel"
              onOpen={() => setIsVesselOpen(true)}
              onClose={() => setIsVesselOpen(false)}
              onChange={(value) => {
                setVesselSearch(value);
                setIsVesselOpen(true);
                setForm((current) => ({ ...current, vesselId: "" }));
              }}
              onSelect={(option) => {
                const vessel = vessels.find((item) => item.id === option.id);
                if (!vessel) return;

                setVesselSearch(vessel.name);
                setIsVesselOpen(false);
                setForm((current) => ({ ...current, vesselId: vessel.id }));
              }}
              loadingText="Loading vessels..."
              emptyText="No vessels found."
            />
            <Field
              label="Date From"
              type="date"
              value={form.dateFrom}
              onChange={(value) => setForm((current) => ({ ...current, dateFrom: value }))}
            />
            <Field
              label="Date To"
              type="date"
              value={form.dateTo}
              onChange={(value) => setForm((current) => ({ ...current, dateTo: value }))}
            />
            <Field
              label="Invoice Number"
              value={form.invoiceNumber}
              onChange={(value) => setForm((current) => ({ ...current, invoiceNumber: value }))}
            />
            <Field
              label="Consolidated Invoice"
              value={form.consolidatedInvoiceNumber}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  consolidatedInvoiceNumber: value,
                }))
              }
            />
            <Field
              label="Invoice Date"
              type="date"
              value={form.invoiceDate}
              onChange={(value) => setForm((current) => ({ ...current, invoiceDate: value }))}
            />
            <Field
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-[#dbe4ff] bg-[linear-gradient(135deg,#f8faff_0%,#eef2ff_100%)] p-5 dark:border-[#2a3550] dark:bg-[linear-gradient(135deg,rgba(21,29,44,0.98)_0%,rgba(17,24,39,0.94)_100%)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1e3a8a] dark:text-[#dbe7ff]">
                  Customer Detail
                </h3>
                <p className="mt-1 text-sm text-[#5b6b8a] dark:text-[#93a4c3]">
                  Make sure the customer invoice data is correct before previewing or generating it.
                </p>
              </div>
              <div className="rounded-full border border-[#c7d2fe] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4f46e5] dark:border-[#31415f] dark:bg-[#182235] dark:text-[#a9bad8]">
                Highlight
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Field
                label="Customer"
                value={form.customer}
                onChange={(value) => setForm((current) => ({ ...current, customer: value }))}
              />
              <Field
                label="Customer Phone"
                value={form.customerPhone}
                onChange={(value) =>
                  setForm((current) => ({ ...current, customerPhone: value }))
                }
              />
              <TextAreaField
                label="Customer Address"
                value={form.customerAddress}
                onChange={(value) =>
                  setForm((current) => ({ ...current, customerAddress: value }))
                }
                className="xl:col-span-2 w-full"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void handlePreview()}
              disabled={loadingPreview || loadingVessels}
              className="h-[46px] rounded-[14px] bg-[#4438ff] px-5 text-white hover:bg-[#3c31ec]"
            >
              {loadingPreview ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={File01Icon} size={18} strokeWidth={1.8} />
                  Preview Table
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportCsv()}
              disabled={exportingCsv || loadingVessels}
              className="h-[46px] rounded-[14px] border-[#d1d5db] px-5"
            >
              {exportingCsv ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.8} />
                  Generate Excel Table
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={loadingVessels}
              className="h-[46px] rounded-[14px] border-[#d1d5db] px-5"
            >
              <HugeiconsIcon icon={File01Icon} size={18} strokeWidth={1.8} />
              Generate Invoice PDF
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 dark:border-white/10 dark:bg-[#111827]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827] dark:text-white">
                Invoice Table Preview
              </h2>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                Preview rows that will be used for Excel export and invoice PDF generation.
              </p>
            </div>
            {preview ? (
              <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-sm text-[#475569] dark:bg-[#151d2c] dark:text-[#cbd5e1]">
                {preview.meta.vesselName || "-"} | {preview.meta.groupCount} group{preview.meta.groupCount === 1 ? "" : "s"} | {preview.meta.itemCount} rows | Total {preview.meta.totalFare}
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-[#f8fafc] dark:border-white/10 dark:bg-[#151d2c]">
                  {[
                    "No",
                    "Title",
                    "Passenger",
                    "Rank",
                    "Status",
                    "Service Date",
                    "Service Area",
                    "Service Mode",
                    "Service Provider",
                    "Service Detail",
                    "Fare",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#64748b] dark:text-[#94a3b8]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview?.rows.length ? (
                  preview.rows.map((row, index) => {
                    const previousRow = preview.rows[index - 1];
                    const showGroupHeader =
                      !previousRow || previousRow.vesselName !== row.vesselName;

                    return (
                      <Fragment key={`row-${row.no}`}>
                        {showGroupHeader ? (
                          <tr
                            key={`group-${row.vesselName}-${index}`}
                            className="border-b border-[#dbe4ff] bg-[#eef2ff] dark:border-[#312e81] dark:bg-[#1e293b]"
                          >
                            <td
                              colSpan={11}
                              className="px-4 py-3 text-left text-sm font-semibold text-[#1e3a8a] dark:text-[#c7d2fe]"
                            >
                              Vessel: {row.vesselName || "All Vessel"}
                            </td>
                          </tr>
                        ) : null}
                        <tr
                          key={row.no}
                          className="border-b border-[#eef2f7] dark:border-white/10"
                        >
                          <Cell>{row.no}</Cell>
                          <Cell>{row.title || "-"}</Cell>
                          <Cell>{row.passenger || "-"}</Cell>
                          <Cell>{row.rank || "-"}</Cell>
                          <Cell>{row.status || "-"}</Cell>
                          <Cell>{row.serviceDate || "-"}</Cell>
                          <Cell>{row.serviceArea || "-"}</Cell>
                          <Cell>{row.serviceMode || "-"}</Cell>
                          <Cell>{row.serviceProvider || "-"}</Cell>
                          <Cell>{row.serviceDetail || "-"}</Cell>
                          <Cell align="right">{row.fare || "-"}</Cell>
                        </tr>
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-14 text-center text-sm text-[#94a3b8] dark:text-[#64748b]"
                    >
                      {loadingVessels
                        ? "Loading vessels..."
                        : "Select filters and click Preview Table to load invoice rows."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
        {label}
      </Label>
      <textarea
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClassName} block min-h-[46px] w-full appearance-none overflow-hidden whitespace-nowrap py-3 leading-[1.4]`}
      />
    </div>
  );
}

function Cell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-[#334155] dark:text-[#d1d5db] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
