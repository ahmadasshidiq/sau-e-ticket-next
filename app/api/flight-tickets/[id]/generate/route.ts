import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { renderFlightTicketHtml } from "@/lib/flight-ticket/template";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const ticket = await prisma.flightTicket.findUnique({
    where: { id },
    include: {
      passengers: true,
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { message: "Flight ticket not found." },
      { status: 404 }
    );
  }

  await prisma.flightTicket.update({
    where: { id },
    data: {
      status: "GENERATED",
    },
  });

  const html = renderFlightTicketHtml({
    ...ticket,
    grandTotal: ticket.grandTotal?.toString() ?? null,
  });
  const printableHtml = html.replace(
    "</body>",
    `<script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.print();
        }, 250);
      });
    </script></body>`
  );

  return new NextResponse(printableHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
