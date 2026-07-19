import type { ReactNode } from "react";
import type { DataColumn, FilterField } from "@/components/dynamic-page";
import { formatCellValue, formatDateTimeDisplay } from "@/lib/formatters";
import { buildSearchParams } from "@/lib/search-params";

export type RankApiRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RanksResponse = {
  data: RankApiRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type RankFormState = {
  name: string;
};

export type RankRow = {
  id: string;
  no: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  actions?: string;
};

export const defaultRankForm: RankFormState = {
  name: "",
};

export const pageTitle = "Rank";
export const pageDescription = "Manage rank master data.";

export const filterFields: FilterField[] = [
  { key: "name", label: "Name", placeholder: "Search name" },
];

export function buildRanksSearchParams(
  page: number,
  pageSize: number,
  filters: Record<string, string>
) {
  return buildSearchParams({ page, pageSize }, filters);
}

export function mapRanksToRows(
  ranks: RankApiRow[],
  startIndex = 0
): RankRow[] {
  return ranks.map((rank, index) => ({
    id: rank.id,
    no: String(startIndex + index + 1),
    name: rank.name,
    createdAt: formatDateTimeDisplay(rank.createdAt),
    updatedAt: formatDateTimeDisplay(rank.updatedAt),
  }));
}

export function buildEditRank(rank: RankRow): RankApiRow {
  return {
    id: rank.id,
    name: rank.name,
    createdAt: "",
    updatedAt: "",
  };
}

export function buildRankForm(rank?: Pick<RankRow, "name">): RankFormState {
  if (!rank) return defaultRankForm;

  return {
    name: rank.name,
  };
}

export function getRankColumns(
  renderActions: (row: RankRow) => ReactNode
): DataColumn<RankRow>[] {
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
