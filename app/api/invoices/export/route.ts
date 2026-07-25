import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { buildInvoiceCsv, type InvoiceGeneratorFilters } from "@/lib/invoice-generator";

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const filters: InvoiceGeneratorFilters = {
    vesselId: searchParams.get("vesselId")?.trim() ?? "",
    dateFrom: searchParams.get("dateFrom")?.trim() ?? "",
    dateTo: searchParams.get("dateTo")?.trim() ?? "",
    invoiceNumber: searchParams.get("invoiceNumber")?.trim() ?? "",
    invoiceDate: searchParams.get("invoiceDate")?.trim() ?? "",
    dueDate: searchParams.get("dueDate")?.trim() ?? "",
    customer: searchParams.get("customer")?.trim() ?? "",
    customerAddress: searchParams.get("customerAddress")?.trim() ?? "",
    customerPhone: searchParams.get("customerPhone")?.trim() ?? "",
    consolidatedInvoiceNumber:
      searchParams.get("consolidatedInvoiceNumber")?.trim() ?? "",
  };

  const csv = await buildInvoiceCsv(filters);
  const fileName =
    filters.invoiceNumber?.replace(/[^\w.-]+/g, "-") ||
    filters.consolidatedInvoiceNumber?.replace(/[^\w.-]+/g, "-") ||
    "invoice-export";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.csv"`,
    },
  });
}
