import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { renderFlightTicketHtml } from "@/lib/flight-ticket/template";
import { prisma } from "@/lib/prisma";

const generatedTicketHtmlCache = new Map<
  string,
  {
    cacheKey: string;
    html: string;
  }
>();

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

  const cacheKey = JSON.stringify({
    updatedAt: ticket.updatedAt.toISOString(),
    status: ticket.status,
    grandTotal: ticket.grandTotal?.toString() ?? null,
    passengerCount: ticket.passengers.length,
  });
  const cached = generatedTicketHtmlCache.get(id);

  if (ticket.status !== "GENERATED") {
    await prisma.flightTicket.update({
      where: { id },
      data: {
        status: "GENERATED",
      },
    });
  }

  const html =
    cached?.cacheKey === cacheKey
      ? cached.html
      : renderFlightTicketHtml({
          ...ticket,
          grandTotal: ticket.grandTotal?.toString() ?? null,
        });

  if (cached?.cacheKey !== cacheKey) {
    generatedTicketHtmlCache.set(id, {
      cacheKey,
      html,
    });
  }

  const printableHtml = html.replace(
    "</body>",
    `<script>
      const printWhenReady = () => {
        const images = Array.from(document.images);

        Promise.all(
          images.map((image) => {
            if (image.complete) {
              return Promise.resolve();
            }

            return new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            });
          })
        ).finally(() => {
          window.print();
        });
      };

      if (document.readyState === 'complete') {
        printWhenReady();
      } else {
        window.addEventListener('load', printWhenReady, { once: true });
      }
    </script></body>`
  );

  return new NextResponse(printableHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
