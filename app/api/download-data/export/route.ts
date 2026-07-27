import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { buildDownloadDataCsv, type DownloadDataFilters } from "@/lib/download-data";

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const filters: DownloadDataFilters = {
    functionCategory: searchParams.get("functionCategory")?.trim() ?? "",
    dateFrom: searchParams.get("dateFrom")?.trim() ?? "",
    dateTo: searchParams.get("dateTo")?.trim() ?? "",
    columns: searchParams.getAll("columns"),
  };

  const csv = await buildDownloadDataCsv(filters);
  const fileNameParts = [
    "download-data",
    filters.functionCategory?.toLowerCase().replaceAll("_", "-") || "all",
    filters.dateFrom || "from",
    filters.dateTo || "to",
  ];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileNameParts.join("-")}.csv"`,
    },
  });
}
