import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { buildInvoicePdfHtml, type InvoiceGeneratorFilters } from "@/lib/invoice-generator";

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

  const html = await buildInvoicePdfHtml(filters);
  const printableHtml = html.replace(
    "</body>",
    `<script>
      window.addEventListener('load', () => {
        window.print();
      }, { once: true });
    </script></body>`
  );

  return new NextResponse(printableHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
