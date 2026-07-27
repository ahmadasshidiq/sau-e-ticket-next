import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { buildDownloadDataPreview, type DownloadDataFilters } from "@/lib/download-data";

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

  const preview = await buildDownloadDataPreview(filters);
  return NextResponse.json(preview);
}
