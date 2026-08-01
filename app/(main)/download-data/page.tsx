"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download01Icon, File01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";

const fieldClassName =
  "h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b] dark:[color-scheme:dark] dark:[&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:opacity-85 dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-200";

const functionOptions = [
  { value: "CREWING_TANKER", label: "Crewing Tanker" },
  { value: "CMOS", label: "CMOS" },
  { value: "TAD", label: "TAD" },
] as const;

const availableColumns = [
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

type ColumnKey = (typeof availableColumns)[number]["key"];

type PreviewResponse = {
  meta: {
    functionCategory: string;
    dateFrom: string;
    dateTo: string;
    itemCount: number;
    selectedColumnCount: number;
  };
  selectedColumns: ColumnKey[];
  rows: Record<ColumnKey, string | number>[];
};

type DownloadDataForm = {
  functionCategory: string;
  dateFrom: string;
  dateTo: string;
  columns: ColumnKey[];
};

const defaultColumns: ColumnKey[] = [
  "bookingReference",
  "docDate",
  "passengerName",
  "rank",
  "vesselName",
  "status",
  "serviceArea",
  "serviceMode",
  "serviceDetail",
  "serviceDate",
  "serviceProvider",
  "fare",
  "ntaFare",
];

const defaultForm: DownloadDataForm = {
  functionCategory: "CREWING_TANKER",
  dateFrom: "",
  dateTo: "",
  columns: defaultColumns,
};

const DOWNLOAD_DATA_COLUMNS_STORAGE_KEY = "download-data-selected-columns-v2";

function buildSearchParams(form: DownloadDataForm) {
  const searchParams = new URLSearchParams();

  if (form.functionCategory.trim()) {
    searchParams.set("functionCategory", form.functionCategory.trim());
  }

  if (form.dateFrom.trim()) {
    searchParams.set("dateFrom", form.dateFrom.trim());
  }

  if (form.dateTo.trim()) {
    searchParams.set("dateTo", form.dateTo.trim());
  }

  form.columns.forEach((column) => {
    searchParams.append("columns", column);
  });

  return searchParams;
}

export default function DownloadDataPage() {
  const [form, setForm] = useState<DownloadDataForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const savedColumns = window.localStorage.getItem(
      DOWNLOAD_DATA_COLUMNS_STORAGE_KEY
    );

    if (!savedColumns) {
      return;
    }

    try {
      const parsedColumns = JSON.parse(savedColumns) as string[];
      const allowedColumns = new Set<ColumnKey>(
        availableColumns.map((column) => column.key)
      );
      const validColumns = parsedColumns.filter(
        (column): column is ColumnKey => allowedColumns.has(column as ColumnKey)
      );

      if (!validColumns.length) {
        return;
      }

      setForm((current) => ({
        ...current,
        columns: validColumns,
      }));
    } catch {
      window.localStorage.removeItem(DOWNLOAD_DATA_COLUMNS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      DOWNLOAD_DATA_COLUMNS_STORAGE_KEY,
      JSON.stringify(form.columns)
    );
  }, [form.columns]);

  const selectedDefinitions = availableColumns.filter((column) =>
    form.columns.includes(column.key)
  );

  function toggleColumn(column: ColumnKey) {
    setForm((current) => {
      const exists = current.columns.includes(column);

      if (exists) {
        if (current.columns.length === 1) {
          toast({
            title: "At least one column is required",
            description: "Please keep at least one column selected.",
            variant: "destructive",
          });
          return current;
        }

        return {
          ...current,
          columns: current.columns.filter((item) => item !== column),
        };
      }

      return {
        ...current,
        columns: [...current.columns, column],
      };
    });
  }

  async function handlePreview() {
    setLoadingPreview(true);

    try {
      const params = buildSearchParams(form);
      const response = await fetch(`/api/download-data/preview?${params.toString()}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as PreviewResponse | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in result
            ? result.message ?? "Failed to load preview."
            : "Failed to load preview."
        );
      }

      setPreview(result as PreviewResponse);
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

  async function handleExport() {
    setExporting(true);

    try {
      const params = buildSearchParams(form);
      const response = await fetch(`/api/download-data/export?${params.toString()}`);

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "Failed to generate export.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `download-data-${form.functionCategory.toLowerCase()}.csv`;
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
      setExporting(false);
    }
  }

  return (
    <DashboardShell
      title="Download Data"
      description="Preview and export flight ticket data based on function, period, and selected columns."
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 dark:border-white/10 dark:bg-[#111827]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[#111827] dark:text-white">
              Download Data
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
              Choose function, period, and the columns you want to preview or export.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-2.5">
              <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">
                Fungsi
              </Label>
              <Select
                value={form.functionCategory}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, functionCategory: String(value) }))
                }
                items={functionOptions}
              >
                <SelectTrigger className="h-[42px] w-full rounded-[14px] border-[#d1d5db] bg-white px-5 text-[15px] text-[#111827] dark:border-white/10 dark:bg-[#151d2c] dark:text-white">
                  <SelectValue placeholder="Select fungsi" />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner>
                    <SelectPopup>
                      <SelectList>
                        {functionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </div>
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
          </div>

          <div className="mt-6 rounded-[24px] border border-[#dbe4ff] bg-[linear-gradient(135deg,#f8faff_0%,#eef2ff_100%)] p-5 dark:border-[#2a3550] dark:bg-[linear-gradient(135deg,rgba(21,29,44,0.98)_0%,rgba(17,24,39,0.94)_100%)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1e3a8a] dark:text-[#dbe7ff]">
                  Column Selection
                </h3>
                <p className="mt-1 text-sm text-[#5b6b8a] dark:text-[#93a4c3]">
                  Select or unselect the columns to show in preview and export.
                </p>
              </div>
              <div className="rounded-full border border-[#c7d2fe] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4f46e5] dark:border-[#31415f] dark:bg-[#182235] dark:text-[#a9bad8]">
                {form.columns.length} Selected
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {availableColumns.map((column) => {
                const checked = form.columns.includes(column.key);

                return (
                  <label
                    key={column.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-[16px] border px-4 py-3 transition ${
                      checked
                        ? "border-[#4438ff] bg-white text-[#1e1b4b] dark:border-[#6366f1] dark:bg-[#182235] dark:text-white"
                        : "border-[#dbe4ff] bg-white/70 text-[#475569] dark:border-[#31415f] dark:bg-[#111827] dark:text-[#cbd5e1]"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleColumn(column.key)}
                    />
                    <span className="text-sm font-medium">{column.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void handlePreview()}
              disabled={loadingPreview}
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
              onClick={() => void handleExport()}
              disabled={exporting}
              className="h-[46px] rounded-[14px] border-[#d1d5db] px-5"
            >
              {exporting ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.8} />
                  Generate Excel
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 dark:border-white/10 dark:bg-[#111827]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827] dark:text-white">
                Download Data Preview
              </h2>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-[#94a3b8]">
                Preview rows that will be exported based on the selected columns.
              </p>
            </div>
            {preview ? (
              <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-sm text-[#475569] dark:bg-[#151d2c] dark:text-[#cbd5e1]">
                {preview.meta.functionCategory || "-"} | {preview.meta.dateFrom || "-"} to{" "}
                {preview.meta.dateTo || "-"} | {preview.meta.itemCount} rows
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-[#f8fafc] dark:border-white/10 dark:bg-[#151d2c]">
                  {selectedDefinitions.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-[#64748b] dark:text-[#94a3b8]"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview?.rows.length ? (
                  preview.rows.map((row, index) => (
                    <tr
                      key={`row-${index + 1}`}
                      className="border-b border-[#eef2f7] dark:border-white/10"
                    >
                      {selectedDefinitions.map((column) => (
                        <Cell key={column.key}>{String(row[column.key] || "-")}</Cell>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={selectedDefinitions.length || 1}
                      className="px-4 py-14 text-center text-sm text-[#94a3b8] dark:text-[#64748b]"
                    >
                      Select filters and click Preview Table to load rows.
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

function Cell({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm text-[#334155] dark:text-[#d1d5db]">
      {children}
    </td>
  );
}
