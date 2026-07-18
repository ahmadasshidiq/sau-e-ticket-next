import type { ReactNode } from "react";
import type {
  DataColumn,
  FilterField,
  ToolbarAction,
} from "@/components/dynamic-page";

export type InvoiceRow = {
  no: string;
  invoiceNo: string;
  vendor: string;
  invoiceDate: string;
  total: string;
  status: string;
  template: string;
  createdAt: string;
  actions: string;
};

export type DataPageConfig<T> = {
  title: string;
  description: string;
  columns: DataColumn<T>[];
  rows: T[];
  primaryAction?: ToolbarAction;
  filterContent?: ReactNode;
  columnContent?: ReactNode;
  filterFields?: FilterField[];
  emptyRows?: number;
  pageSizeOptions?: number[];
  initialPageSize?: number;
};

export const pageConfig: DataPageConfig<InvoiceRow> = {
  title: "Users",
  description: "Manage internal users and permission access.",
  columns: [
    {
      key: "no",
      title: "No",
      textClassName: "font-medium text-slate-700",
    },
    {
      key: "invoiceNo",
      title: "Invoice No",
      textClassName: "font-semibold text-slate-900",
    },
    {
      key: "vendor",
      title: "Vendor",
      formatter: (value) => formatCell(value),
    },
    {
      key: "invoiceDate",
      title: "Invoice Date",
      formatter: (value) => formatCell(value),
    },
    {
      key: "total",
      title: "Total",
      formatter: (value) => formatCell(value),
    },
    {
      key: "status",
      title: "Status",
      formatter: (value) => formatCell(value),
    },
    {
      key: "template",
      title: "Template",
      formatter: (value) => formatCell(value),
    },
    {
      key: "createdAt",
      title: "Created At",
      formatter: (value) => formatCell(value),
    },
    {
      key: "actions",
      title: "Actions",
      align: "center",
      formatter: () => "-",
    },
  ],
  rows: [],
  primaryAction: { label: "Upload Document" },
  filterFields: [
    {
      key: "name",
      label: "Name",
      placeholder: "Search name",
    },
    {
      key: "code",
      label: "Code",
      placeholder: "Search code",
    },
  ],
  filterContent: <span>Filter controls</span>,
  columnContent: <span>Column controls</span>,
};

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}
