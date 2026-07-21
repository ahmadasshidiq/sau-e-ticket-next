import { NextResponse } from "next/server";
import { assertApiSession } from "@/lib/auth";
import { serializeFlightTicket } from "@/lib/flight-ticket/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const unauthorized = await assertApiSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10"));
  const provider = searchParams.get("provider")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const keyword = searchParams.get("keyword")?.trim() ?? "";

  const where = {
    ...(provider ? { provider } : {}),
    ...(status ? { status: status as "DRAFT" | "GENERATED" } : {}),
    ...(keyword
      ? {
          OR: [
            { pnr: { contains: keyword, mode: "insensitive" as const } },
            {
              airline: {
                contains: keyword,
                mode: "insensitive" as const,
              },
            },
            {
              ticketNumber: {
                contains: keyword,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.flightTicket.findMany({
      where,
      include: {
        passengers: true,
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.flightTicket.count({ where }),
  ]);

  return NextResponse.json({
    data: tickets.map(serializeFlightTicket),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
