import type { ReactNode } from "react";
import type { VesselType } from "@prisma/client";
import type { DataColumn, FilterField } from "@/components/dynamic-page";
import { formatCellValue, formatDateTimeDisplay } from "@/lib/formatters";
import { buildSearchParams } from "@/lib/search-params";

export type VesselApiRow = {
  id: string;
  name: string;
  type: VesselType;
  createdAt: string;
  updatedAt: string;
};

export type VesselsResponse = {
  data: VesselApiRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type VesselFormState = {
  name: string;
  type: VesselType;
};

export type VesselRow = {
  id: string;
  no: string;
  name: string;
  type: VesselType;
  createdAt: string;
  updatedAt: string;
  actions?: string;
};

export const defaultVesselForm: VesselFormState = {
  name: "",
  type: "CREWING_TANKER",
};

export const vesselTypeOptions: VesselType[] = [
  "CREWING_TANKER",
  "CMOS",
  "TAD",
];

export const pageTitle = "Vessel";
export const pageDescription = "Manage vessel master data.";

export const filterFields: FilterField[] = [
  { key: "name", label: "Name", placeholder: "Search name" },
  { key: "type", label: "Type", placeholder: "Search type" },
];

export function buildVesselsSearchParams(
  page: number,
  pageSize: number,
  filters: Record<string, string>
) {
  return buildSearchParams({ page, pageSize }, filters);
}

export function mapVesselsToRows(
  vessels: VesselApiRow[],
  startIndex = 0
): VesselRow[] {
  return vessels.map((vessel, index) => ({
    id: vessel.id,
    no: String(startIndex + index + 1),
    name: vessel.name,
    type: vessel.type,
    createdAt: formatDateTimeDisplay(vessel.createdAt),
    updatedAt: formatDateTimeDisplay(vessel.updatedAt),
  }));
}

export function buildEditVessel(vessel: VesselRow): VesselApiRow {
  return {
    id: vessel.id,
    name: vessel.name,
    type: vessel.type,
    createdAt: "",
    updatedAt: "",
  };
}

export function buildVesselForm(
  vessel?: Pick<VesselRow, "name" | "type">
): VesselFormState {
  if (!vessel) return defaultVesselForm;

  return {
    name: vessel.name,
    type: vessel.type,
  };
}

export function getVesselColumns(
  renderActions: (row: VesselRow) => ReactNode
): DataColumn<VesselRow>[] {
  return [
    {
      key: "no",
      title: "No",
      textClassName: "font-medium text-slate-700",
      widthClassName: "w-[72px]",
    },
    {
      key: "name",
      title: "Name",
      textClassName: "font-semibold text-slate-900",
    },
    {
      key: "type",
      title: "Type",
      formatter: (value) => formatBadge(value, "indigo"),
    },
    {
      key: "createdAt",
      title: "Created At",
      formatter: (value) => formatCellValue(value),
    },
    {
      key: "updatedAt",
      title: "Updated At",
      formatter: (value) => formatCellValue(value),
    },
    {
      key: "actions",
      title: "Actions",
      align: "center",
      formatter: (_value, row) => renderActions(row),
    },
  ];
}

function formatBadge(value: unknown, tone: "indigo" | "slate") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const toneClassName =
    tone === "indigo"
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${toneClassName}`}
    >
      {String(value)}
    </span>
  );
}
